import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import { store } from "./store";
import { antdTheme } from "./theme";
import "./styles/global.css";

/**
 * 后台应用入口（技术文档 §8.1/§8.2）
 * 功能说明：
 * - Redux Provider：全局状态（auth/权限码）；
 * - ConfigProvider：AntD 深林金韵主题 + 中文 locale（UIUX §12.2）。
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={antdTheme} locale={zhCN}>
        <App />
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
