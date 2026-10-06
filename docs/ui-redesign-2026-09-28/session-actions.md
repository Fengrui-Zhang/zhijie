# 分析记录操作菜单

来源：`npx shadcn@latest view @uselayouts/smooth-dropdown`；完整原组件存于 `upstream/smooth-dropdown.registry.json`，沿用仓库 `licenses/uselayouts-MIT.txt`。

2026-10-06：记录行的删除和留存合并到一个菜单，留存以点亮按钮表示开启，清理逻辑保持默认 15 天、开启免自动清理、关闭重新计时。

保留原组件 40px→220px 的展开、圆角 12→14、spring damping 34 / stiffness 380 / mass 0.8；内容 200ms 淡入延迟 80ms，行项目 x8→0 依次进入，悬停背景和侧线使用 damping 30 / stiffness 520 / mass 0.8。保留项目删除按钮的 3 秒取消过程。适配主题配色、键盘操作、减少动态效果、视口边缘和滚动容器；菜单关闭立即取消尚未提交的删除倒计时。

省略号图标在同一个变形面板内以 150ms 淡出并缩至 0.8，收起时反向恢复，避免面板在收拢期间出现空白按钮。留存开启后以主题金色背景和实心书签保持点亮。
