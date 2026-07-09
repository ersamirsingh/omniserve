import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Suspense } from 'react';
import AuthLayout from '../../layouts/AuthLayout';
import DashboardLayout from '../../layouts/DashboardLayout';
import ProtectedRoute from '../../layouts/ProtectedRoute';
import AuthRoute from '../../layouts/authRoute';
import Spinner from '../../components/ui/Spinner';
import { authRoutes, dashboardRoutes, publicWebsiteRoutes } from './routeRegistry';

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

function renderRouteElement(Component, Wrapper = null) {
  const element = <Component />;
  return Wrapper ? <Wrapper>{element}</Wrapper> : element;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AuthLayout />}>
            {authRoutes.map(({ path, component }) => (
              <Route
                key={path}
                path={path}
                element={renderRouteElement(component, AuthRoute)}
              />
            ))}
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/categories" element={<Navigate to="/menu-management?tab=categories" replace />} />
              <Route path="/menu-items" element={<Navigate to="/menu-management?tab=items" replace />} />
              <Route path="/variants" element={<Navigate to="/menu-management?tab=variants" replace />} />
              <Route path="/addons" element={<Navigate to="/menu-management?tab=addons" replace />} />
              <Route path="/operations" element={<Navigate to="/operations/dine-in" replace />} />
              {dashboardRoutes.map(({ path, component, roles }) => {
                const Component = component;
                const element = <Component />;
                return roles && roles !== 'all' ? (
                  <Route key={path} element={<ProtectedRoute roles={roles} />}>
                    <Route path={path} element={element} />
                  </Route>
                ) : (
                  <Route key={path} path={path} element={element} />
                );
              })}
            </Route>
          </Route>

          {publicWebsiteRoutes.map(({ path, component: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
