// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { loginApi, registerApi, logoutApi, getMeApi } from '../api/models/auth.api';

// export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
//   try {
//     const res = await loginApi(credentials);
//     return res.data.data;
//   } catch (err) {
//     return rejectWithValue(err.response?.data?.message || 'Login failed');
//   }
// });

// export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
//   try {
//     const res = await registerApi(data);
//     return res.data;
//   } catch (err) {
//     return rejectWithValue(err.response?.data?.message || 'Registration failed');
//   }
// });

// export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
//   try {
//     await logoutApi();
//   } catch (err) {
//     return rejectWithValue(err.response?.data?.message || 'Logout failed');
//   }
// });

// export const fetchCurrentUser = createAsyncThunk(
//   'auth/fetchMe',
//   async (_, { rejectWithValue }) => {
//     try {
//       const res = await getMeApi();
//       return res.data.data;
//     } catch (err) {
//       return rejectWithValue(err.response?.data?.message || 'Session expired');
//     }
//   },
//   {
//     condition: (_, { getState }) => {
//       const { auth } = getState();
//       return auth.loading !== 'pending' && !auth.isAuthenticated;
//     },
//   }
// );

// const authSlice = createSlice({
//   name: 'auth',
//   initialState: {
//     user: null,
//     isAuthenticated: false,
//     loading: 'idle',
//     authChecked: false,
//     error: null,
//   },
//   reducers: {
//     clearError(state) {
//       state.error = null;
//     },
//     resetAuth(state) {
//       state.user = null;
//       state.isAuthenticated = false;
//       state.loading = 'idle';
//       state.authChecked = true;
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       /* login */
//       .addCase(loginUser.pending, (state) => { state.loading = 'pending'; state.error = null; })
//       .addCase(loginUser.fulfilled, (state, action) => {
//         state.loading = 'succeeded';
//         state.user = action.payload.user;
//         state.isAuthenticated = true;
//         state.authChecked = true;
//       })
//       .addCase(loginUser.rejected, (state, action) => {
//         state.loading = 'failed';
//         state.authChecked = true;
//         state.error = action.payload;
//       })
//       /* register */
//       .addCase(registerUser.pending, (state) => { state.loading = 'pending'; state.error = null; })
//       .addCase(registerUser.fulfilled, (state) => { state.loading = 'succeeded'; })
//       .addCase(registerUser.rejected, (state, action) => {
//         state.loading = 'failed';
//         state.error = action.payload;
//       })
//       /* logout */
//       .addCase(logoutUser.fulfilled, (state) => {
//         state.user = null;
//         state.isAuthenticated = false;
//         state.loading = 'idle';
//         state.authChecked = true;
//       })
//       /* fetch me */
//       .addCase(fetchCurrentUser.pending, (state) => { state.loading = 'pending'; })
//       .addCase(fetchCurrentUser.fulfilled, (state, action) => {
//         state.loading = 'succeeded';
//         state.user = action.payload;
//         state.isAuthenticated = true;
//         state.authChecked = true;
//       })
//       .addCase(fetchCurrentUser.rejected, (state) => {
//         state.loading = 'failed';
//         state.user = null;
//         state.isAuthenticated = false;
//         state.authChecked = true;
//       });
//   },
// });

// export const { clearError, resetAuth } = authSlice.actions;
// export default authSlice.reducer;







import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginApi, registerApi, logoutApi, getMeApi } from '../api/models/auth.api';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await loginApi(credentials);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await registerApi(data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await logoutApi();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Logout failed');
  }
});

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getMeApi();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Session expired');
    }
  },
  {
    condition: (force, { getState }) => {
      const { auth } = getState();
      if (force === true) return auth.loading !== 'pending';
      return auth.loading !== 'pending' && !auth.isAuthenticated;
    },
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: 'idle',
    authChecked: false,
    error: null,
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
    resetAuth(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = 'idle';
      state.authChecked = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* login */
      .addCase(loginUser.pending, (state) => { state.loading = 'pending'; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.authChecked = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = 'failed';
        state.authChecked = true;
        state.error = action.payload;
      })
      /* register */
      .addCase(registerUser.pending, (state) => { state.loading = 'pending'; state.error = null; })
      .addCase(registerUser.fulfilled, (state) => { state.loading = 'succeeded'; })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload;
      })
      /* logout */
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = 'idle';
        state.authChecked = true;
      })
      /* fetch me */
      .addCase(fetchCurrentUser.pending, (state) => { state.loading = 'pending'; })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
        state.authChecked = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = 'failed';
        state.user = null;
        state.isAuthenticated = false;
        state.authChecked = true;
      });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;