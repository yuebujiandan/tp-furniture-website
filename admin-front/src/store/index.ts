import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

/**
 * 后台 Redux Store（技术文档 §8.1：Redux Toolkit）
 * 功能说明：集中管理后台状态；当前包含 auth（token/员工/权限码），后续模块状态按需扩展。
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

/** RootState 类型：useSelector 使用 */
export type RootState = ReturnType<typeof store.getState>;
/** AppDispatch 类型：useDispatch 使用 */
export type AppDispatch = typeof store.dispatch;
