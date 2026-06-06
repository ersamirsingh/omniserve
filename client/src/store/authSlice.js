import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosClient from '../API/axiosClient'



export const registerUser = createAsyncThunk(

    'auth/register',
    async (userData, { rejectWithValue }) => {
        // console.log(userData)

        try{

            const response =  await axiosClient.post('/auth/register', userData);
            // console.log(response.user)
            return response.data;

        } catch (error) {

            return rejectWithValue(error);

        }
    }
);



export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        // console.log(credentials)

        try {
            // console.log(credentials)
            const response = await axiosClient.post('/auth/login', credentials);
            console.log(response)
            return response.data;
        } catch (error) {
            if (error.response) {
                return rejectWithValue(error.response.data);
            } else {
                return rejectWithValue({ message: error.message || 'Network Error' });
            }
        }
    }
);



export const logoutUser = createAsyncThunk(
    'auth/logout',  //slice/route
    async (_, { rejectWithValue }) => {
        try {
            // console.log('logout')
            await axiosClient.get('/auth/logout')
            // console.log(response);
            return null;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);



export const checkAuth = createAsyncThunk(
    'auth/check',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/auth/check');
            return data.user;
        } catch (error) {
            return rejectWithValue(error);
        }
    }
);




const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
    },

    reducers: {
    },

    extraReducers: (builder) => {

        builder

        // Register User Cases
        .addCase(registerUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(registerUser.fulfilled, (state, action) => {
            state.loading = false;
            state.isAuthenticated = !!action.payload;
            state.user = action.payload;
        })
        .addCase(registerUser.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload?.message || 'Something went wrong';
            state.isAuthenticated = false;
            state.user = null;
        })
    
        // Login User Cases
        .addCase(loginUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(loginUser.fulfilled, (state, action) => {
            state.loading = false;
            state.isAuthenticated = !!action.payload;
            state.user = action.payload;
        })
        .addCase(loginUser.rejected, (state, action) => {
            state.loading = false;
            state.error = action?.payload?.response?.data || 'Something went wrong';
            state.isAuthenticated = false;
            state.user = null;
        })
    
        // Check Auth Cases
        .addCase(checkAuth.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(checkAuth.fulfilled, (state, action) => {
            state.loading = false;
            state.isAuthenticated = !!action.payload;
            state.user = action.payload;
        })
        .addCase(checkAuth.rejected, (state) => {
            state.loading = false;
            state.error = null;
            state.isAuthenticated = false;
            state.user = null;
        })
    
        // Logout User Cases
        .addCase(logoutUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(logoutUser.fulfilled, (state) => {
            state.loading = false;
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
        })
        .addCase(logoutUser.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload?.response?.message || 'Something went wrong';
            state.isAuthenticated = false;
            state.user = null;
        });
    }
});



export default authSlice.reducer;