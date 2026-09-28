# 原界面交互适配记录

2026-09-28。执行用户确认的交互优化范围；右上角账户菜单按照用户追加要求采用 Smooth Dropdown。保留其原账户字段、动作和权限判断。

## 来源

useLayouts 固定版本 `78bfa803aed67d424755b66bb3f30eeed42d7502`；原源码及本地导入闭包见同目录 ZIP 和 `source-manifest.json`。MIT 许可证同时保存在 `licenses/uselayouts-MIT.txt`。

| 上游组件 | 本地实现 | 适配 |
|---|---|---|
| `smooth-dropdown.tsx` | `components/UserMenuPopup.tsx` | 保留右侧锚定、尺寸展开、共享悬停背景与左侧指示条；现有账户回调替换演示菜单；增加屏幕边界、键盘、关闭回焦与触摸处理；原生 ResizeObserver 替换 react-use-measure |
| `discrete-tabs.tsx` | `components/InteractionMotion.tsx` 的 SelectionGroup/SelectionHighlight | 隔离 layoutId，保留原标签与按钮布局，只移动选中背景；应用于八字、紫微、风水时间层、出生表单、运势解释模式、设置和手机底栏 |
| `prompt-box.tsx` | `components/agent/AgentChatWorkspace.tsx` | 借鉴高度/聚焦变化，保留现有输入和上下文位置；多行自动伸缩、中文组合态与忙碌防重入 |
| `tactile-button.tsx` | `app/globals.css` | 仅借鉴轻微按压反馈，统一原有按钮释放曲线；不移植示例材质、旋转和文案 |
| `save-button.tsx` | `TransitionText`、`AiBusyText` | 真实状态驱动文字/图标与宽度过渡；不使用上游模拟成功计时；修复工作中按钮透明度 |

Motion 为新增运行依赖。未初始化 shadcn 全站主题，未改 Tailwind 大版本；使用已归档源码按现有项目适配。组件中的演示图标与占位数据未进入正式应用。

## 验证

- TypeScript 检查、生产构建（直接执行 next build，未执行数据库迁移）及改动空白检查通过。
- 原应用访客路径：命例表单性别/公农历切换、导航折叠、出生时间嵌套弹窗、逐层 Escape 和焦点回归已在浏览器检查。
- 实际账户组件以隔离测试数据验证：桌面及390×844窄屏、展开边界、方向键、Escape、关闭与回调。临时验证路由已删除。
- 实际聊天组件以隔离数据检查上下文展开/收起、多行输入、忙碌 Enter 不触发提交；长请求按钮计算透明度为0.95；该轮组件检查无浏览器错误或警告。
- 本机未登录真实账号，未执行改密、退出、注销或收费请求；真实手机输入法、软键盘及完整登录业务链路仍需后续实机验证。

所有产品标题、说明文字与业务内容沿用原项目。测试页面只用于现有组件验证，不属于交付页面。
