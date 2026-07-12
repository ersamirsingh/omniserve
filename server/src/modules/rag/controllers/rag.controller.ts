import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ChatSession, { IMessage } from '../models/chat-session.model.js';
import { QueryRouter, IRouteDecision, IScopeFilter } from '../router/query-router.js';
import { ToolExecutor } from '../tools/tool-executor.js';
import { QdrantService } from '../services/qdrant.service.js';
import { Neo4jService } from '../services/neo4j.service.js';
import { LlmService } from '../services/llm.service.js';
import { getSystemPrompt, RagRole } from '../prompts/prompt-registry.js';
import { IngestionService } from '../ingestion/ingestion.service.js';

export class RagController {
  /**
   * List all non-deleted sessions for the authenticated user.
   * GET /api/rag/chats
   */
  static async listSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const sessions = await ChatSession.find({
        userId: new mongoose.Types.ObjectId(req.user.userId as string),
      }).sort({ updatedAt: -1 });

      res.status(200).json({ success: true, sessions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to list chat sessions', error: error.message });
    }
  }

  /**
   * Retrieve a specific session's history.
   * GET /api/rag/chats/:id
   */
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const session = await ChatSession.findOne({
        _id: new mongoose.Types.ObjectId(id as string),
        userId: new mongoose.Types.ObjectId(req.user.userId as string),
      });

      if (!session) {
        res.status(404).json({ success: false, message: 'Chat session not found' });
        return;
      }

      res.status(200).json({ success: true, session });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to retrieve session', error: error.message });
    }
  }

  /**
   * Create a new blank chat session.
   * POST /api/rag/chats
   */
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const session = await ChatSession.create({
        userId: new mongoose.Types.ObjectId(req.user.userId as string),
        tenantId: req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId as string) : null,
        outletId: req.user.outletId ? new mongoose.Types.ObjectId(req.user.outletId as string) : null,
        title: req.body.title || 'New Chat',
        messages: [],
      });

      res.status(201).json({ success: true, session });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to create session', error: error.message });
    }
  }

  /**
   * Soft delete (isDeleted: true) a chat session.
   * DELETE /api/rag/chats/:id
   */
  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const session = await ChatSession.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id as string),
          userId: new mongoose.Types.ObjectId(req.user.userId as string),
        },
        { isDeleted: true },
        { new: true }
      );

      if (!session) {
        res.status(404).json({ success: false, message: 'Chat session not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Chat session deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to delete session', error: error.message });
    }
  }

  /**
   * Handles multi-backend secure RAG queries.
   * POST /api/rag/chat
   */
  static async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const { message, sessionId } = req.body;
      if (!message) {
        res.status(400).json({ success: false, message: 'Message is required' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'User session context missing' });
        return;
      }

      const role = req.user.role as RagRole;

      // 1. Classify the user query
      const decision: IRouteDecision = await QueryRouter.classifyQuery(message, role);

      // 2. Enforce tenancy security boundary at data access layer
      const security = QueryRouter.enforceSecurityScope(req.user, decision.toolParams || {});
      if (!security.isAllowed) {
        res.status(403).json({
          success: false,
          message: security.refusalReason || 'Access Denied',
          code: 'TENANCY_REFUSAL',
        });
        return;
      }

      const scope = security.scope;
      let retrievedContext = '';

      // 3. Execute appropriate database retrieval
      if (decision.backend === 'structured-aggregation' && decision.toolName) {
        const result = await ToolExecutor.execute(decision.toolName, decision.toolParams || {}, scope);
        retrievedContext = `Structured Aggregation Result [Tool: ${decision.toolName}]: ${JSON.stringify(result)}`;
      } 
      else if (decision.backend === 'graph') {
        const tenantId = scope.tenantId;
        if (!tenantId) {
          retrievedContext = 'GraphDB traversal restricted: tenantId not available in scope.';
        } else {
          const searchVal = message.substring(0, 30);
          const cypherQuery = `
            MATCH (n)
            WHERE n.tenantId = $tenantId
              AND (n.name CONTAINS $searchVal OR n.orderNumber CONTAINS $searchVal OR n.id = $searchVal)
            OPTIONAL MATCH (n)-[r]-(m)
            WHERE m.tenantId = $tenantId OR m.tenantId IS NULL
            RETURN n, r, m LIMIT 15
          `;
          const records = await Neo4jService.runQuery(cypherQuery, { tenantId, searchVal });
          const formatted = records.map(rec => Neo4jService.formatRecord(rec));
          retrievedContext = `Graph database connections: ${JSON.stringify(formatted)}`;
        }
      } 
      else {
        const vector = await LlmService.getEmbedding(message);
        const entityType = decision.intent === 'semantic-lookup' ? 'MenuItem' : null;
        const hits = await QdrantService.searchVectors(vector, scope as any, entityType, 5);
        
        retrievedContext = hits.length > 0 
          ? hits.map(h => `[Source: ${h.payload.entityType} ID: ${h.payload.entityId}] ${h.payload.text}`).join('\n')
          : 'No relevant logs or unstructured context found in vector storage.';
      }

      // 4. Resolve system prompt
      const promptCtx: { tenantId?: string; outletId?: string } = {};
      if (req.user.tenantId) promptCtx.tenantId = req.user.tenantId as string;
      if (req.user.outletId) promptCtx.outletId = req.user.outletId as string;
      const systemPrompt = getSystemPrompt(role, promptCtx);

      // 5. Synthesize final answer via Gemini
      const userPrompt = `
You have been provided with context retrieved from the database backends. Use this context to answer the user's question accurately. Do not fabricate numerical data. If the answer is not present, state that you do not have enough data.

Retrieved Context:
"""
${retrievedContext}
"""

User Question: "${message}"
Answer:
`;

      const response = await LlmService.generateContent(systemPrompt, userPrompt);

      // 6. Persist conversation inside MongoDB ChatSession
      let activeSession;
      const userMsg: IMessage = {
        role: 'user',
        text: message,
        timestamp: new Date(),
      };
      const assistantMsg: IMessage = {
        role: 'assistant',
        text: response.text,
        timestamp: new Date(),
        routing: {
          intent: decision.intent,
          backend: decision.backend,
        },
      };

      if (sessionId) {
        activeSession = await ChatSession.findOne({
          _id: new mongoose.Types.ObjectId(sessionId as string),
          userId: new mongoose.Types.ObjectId(req.user.userId as string),
        });
      }

      if (activeSession) {
        activeSession.messages.push(userMsg, assistantMsg);
        // If session title is still default "New Chat", name it after the first user query
        if (activeSession.title === 'New Chat') {
          activeSession.title = message.substring(0, 35) + (message.length > 35 ? '...' : '');
        }
        await activeSession.save();
      } else {
        // Create new session automatically if not provided or missing
        activeSession = await ChatSession.create({
          userId: new mongoose.Types.ObjectId(req.user.userId as string),
          tenantId: req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId as string) : null,
          outletId: req.user.outletId ? new mongoose.Types.ObjectId(req.user.outletId as string) : null,
          title: message.substring(0, 35) + (message.length > 35 ? '...' : ''),
          messages: [userMsg, assistantMsg],
        });
      }

      res.status(200).json({
        success: true,
        answer: response.text,
        sessionId: activeSession._id.toString(),
        routing: {
          intent: decision.intent,
          backend: decision.backend,
        },
      });
    } catch (error: any) {
      console.error('[RagController] Chat error:', error);
      res.status(500).json({ success: false, message: 'RAG query processing failed', error: error.message });
    }
  }

  /**
   * Triggers ingestion sync job.
   * POST /api/rag/sync
   */
  static async handleSync(req: Request, res: Response): Promise<void> {
    try {
      const forceReindex = req.query.force === 'true';
      const result = await IngestionService.runIncrementalSync(forceReindex);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Ingestion sync completed successfully',
          details: {
            vectorSynced: result.vectorSynced,
            graphSynced: result.graphSynced,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Ingestion sync failed',
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error('[RagController] Sync trigger error:', error);
      res.status(500).json({ success: false, message: 'Sync trigger execution failed', error: error.message });
    }
  }
}
