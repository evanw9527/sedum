# Sedum

Sedum 是一个基于 React 和 Vite 的单页面 Agent 应用，包含 AI 对话工作台与流程编排器。

## 本地开发

先启动 Snow Grass Python 后端：

```bash
cd /Users/tb/Documents/snow-grass
cp .env.example .env
uv run uvicorn snow_grass.main:app --reload
```

再启动 Sedum：

```bash
cd /Users/tb/Documents/sedum
pnpm install
pnpm dev
```

Vite 默认将 `/api` 代理到 `http://127.0.0.1:8000`。如果后端地址不同，复制 `.env.example` 为 `.env` 并修改 `SNOW_GRASS_PROXY_TARGET`；前后端分开部署时，将 `VITE_API_BASE_URL` 设为完整 API 地址。

DeepSeek/GLM Key 配置在 Snow Grass 的 `.env` 中，不得写入 Sedum 前端环境变量。

质量检查：

```bash
pnpm lint
pnpm build
```

## 目录结构

```text
src/
├── app/
│   └── App.jsx                         # 单页面应用入口
├── component/
│   ├── agent/                          # Agent 对话组件与数据
│   │   ├── components/
│   │   └── agent.data.js
│   └── workflow/                       # 流程编排组件与数据
│       ├── components/                 # 页面区域组件
│       │   ├── WorkflowActions.jsx
│       │   ├── NodeLibrary.jsx
│       │   └── InspectorPanel.jsx
│       ├── workflow.data.js            # 初始流程和组件库定义
│       └── workflow.utils.js           # 连线路径等纯函数
├── page/
│   ├── agent/
│   │   └── AgentPage.jsx               # Agent 对话页面
│   └── workflow/
│       └── WorkflowPage.jsx            # 流程编排页面
├── shared/
│   └── ui/
│       └── Icon.jsx                    # 通用 SVG 图标
├── styles/
│   ├── global.css                      # 全局基础样式
│   ├── agent.css                       # Agent 对话界面样式
│   └── workflow.css                    # 流程编辑器样式
└── main.jsx                            # React 挂载入口
```

项目保持单页面结构，目前不引入路由。页面级状态和布局放入 `page/`，页面内部组件放入 `component/`；只有确实被多个页面复用的内容才进入 `shared/`。

## 流程编辑操作

- 点击左侧组件，将节点添加到画布。
- 拖动节点调整位置。
- 点击节点右侧圆形端口开始连线，再点击目标节点左侧端口完成连接。
- 也可以从右侧端口直接拖到目标节点左侧端口并松开。
- 点击连线标签，配置规则类型和决策因子。
- 触摸板双指滚动画布，捏合进行缩放。
