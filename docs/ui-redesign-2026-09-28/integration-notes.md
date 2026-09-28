> 范围已修正：本文件保留源码研究记录；涉及页面重排或新增功能的建议已撤回，实际范围以 [修正版方案](README.md) 为准。

# 组件源码与适配约定

上游：<https://github.com/iurvish/uselayouts>；固定提交：`78bfa803aed67d424755b66bb3f30eeed42d7502`（提交时间 2026-09-25T10:48:21+05:30）。演示：<https://uselayouts.com/browse>。

源码 ZIP 保留原文件字节，MIT License 一并保存。所有64项主文件和静态相对路径/`@/` 导入递归闭包已收集；93个归档文件，无未解析本地导入。远程演示图片、第三方 npm 包二进制与运行环境不在归档范围。后续选用的衍生代码应保留版权说明和 upstream 链接。

`source-manifest.json` 中 `undeclared_direct_packages` 是闭包导入与单项 registry 声明差异的线索，不等于每一项都是上游错误：部分依赖由 UI registry 子组件带入。真正接入时按裁剪后的代码决定最小依赖集合。

| 候选 | 已确认源码细节 | 接入前必须完成 |
|---|---|---|
| Discrete Tabs | 内部硬编码 tabs；仅活跃项显示文字；点击元素为 motion.div；共享 layoutId | 改受控组件；所有中文标签常显；button/tab/tabpanel语义、方向键/Home/End；每实例隔离 layoutId |
| Animated Collection | list/card/pack 内部状态，演示照片数据 | 数据从命例传入；保留稳定 key、同一排序及焦点；仅保留 list/card |
| Create Menu | 文档 mousedown 关闭；硬编码菜单，没有业务回调 | 补 Escape、焦点回归、菜单键盘路径；真实 onAction；防止点击外部造成丢失输入 |
| Smooth Dropdown | 实际导入 react-use-measure；registry未声明；存在 Tailwind4 `m-0!` 等写法；可点击 li | 校正依赖或改用现有测量；适配 Tailwind3；菜单语义、键盘、边缘防溢出；layoutId隔离 |
| Dynamic Toolbar | 自带 hooks/use-measure；演示操作数组 | 受控 action 清单；打开时不遮正文；复制/导出失败单独状态；生成成本明确 |
| Filter Interaction | 示范过滤交互 | 筛选条件与实际记录数据受控绑定；提供清空/结果数；窄屏摘要与展开面板 |
| Inline Edit | 初值为演示文本；内部状态；依赖 Input 和 lib/cn | 真初值/onSave；忙碌/错误/取消；Enter与Esc、中文组合态；失败保留编辑内容 |
| Save Button / 网站部分入口名 Status Button | 2500ms定时进入成功，随后2000ms回idle；导入ui/button但registryDependencies为空 | 删除模拟完成定时；状态由真实操作结果驱动；增加error；补本地按钮依赖或使用智解ActionButton |
| Prompt Box | 主文件2205行；提交后立即清空折叠；缺少完整pending/disabled API；演示模型和语音入口 | 裁掉不支持的模型/语音/上传；受控草稿/真实pending/error；中文IME；上下文入口；聚焦不触发提交 |
| Bottom Menu | 内置主题/通知示范面板；图标按钮缺少部分可访问名称 | 连接实际路由/用户导航偏好；保留标签；底部安全区与键盘处理；非hover唯一入口 |
| Theme Toggle | native checkbox与内部状态；局部主题皮肤 | 改为checked/onChange受控开关并明确label；借鉴现有设置的开关，不代表已支持全站暗色主题 |
| Curve Drawer | 主文件依赖curve-drawer-primitives和curve-drawer-curve，但registry仅列主文件；基于Vaul；800ms关闭 | 本次归档已补齐helper；优先使用现有DialogPortal契约；缩短时长；拖动不妨碍长文滚动 |
| Multi Step Form | 演示项目字段与console提交；含react-hook-form/zod/date-fns/sonner/react-use-measure；field子组件未列在对应registryDependencies | 仅用流程模式，真实出生日期/闰月/真太阳时继续使用项目逻辑；后退不丢值，错误可定位 |
| Stacked List | 可展开搜索列表，根交互有div | 只用于选中资料/最近记录摘要；真实数据/键盘语义；不替代完整列表 |
| Tactile Button | Motion press/hover；多层材质 | 降低幅度与阴影，协调全局:active；不在专业表格每个单元叠加 |
| Vertical Tabs | 图片服务展示与自动切换 | 只借鉴设置布局，取消自动导航，内容受实际设置tab控制 |
| AccordionOS | 图片自动播放/展示逻辑，额外tooltip导入 | 只借鉴展开反馈；工具日志默认由用户控制；不能在阅读时自动收起 |
| Delete Button | DialKit调参、计时与本地动画状态 | 删除操作继续原有明确确认；不引入调参工具；先服务器成功再更新列表 |

## 不能误用的示例

- Day Picker 实际选择 Daily/Weekly/Monthly/Yearly 和星期，不是完整日期选择器。不能处理公农历/闰月等排盘要求。
- Scan Document / Set Timer 的演示计时不等于AI进度；不能把慢请求伪装成固定百分比或倒计时。
- 图片网格、Coverflow、照片堆叠、Gooey Navbar、WebGL徽章等不进入高频专业工具界面。

## 建议的本地接口

以下是未来实现契约，不是本轮已实现组件：

```ts
type ActionState = 'idle' | 'unavailable' | 'loading-existing' | 'submitting' | 'success' | 'error';
// ActionButton: state, disabledReason, costLabel, onAction, children
// SegmentedControl: value, onValueChange, items, accessibleLabel
// ResponsivePanel: open, onOpenChange, title, triggerRef, children
// InlineEditable: value, onSave, onCancel, pending, error
// ContextComposer: value, onChange, onSubmit, pending, references, error
```

避免一次安装所有 registry 项。每一项先复核调用点、裁剪演示内容、接入真实数据，再验证视觉/键盘/触摸和失败路径。全局减少动态效果需涵盖 Motion 和 CSS；多实例 layoutId 必须局部隔离。
