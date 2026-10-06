# Bento Card 功能切换

2026-10-06。用户确认以各功能之间的切换为主，排盘页内栏目同时参考。

来源：https://uselayouts.com/docs/components/bento-card 。通过 `npx shadcn@latest view @uselayouts/bento-card` 获取，完整注册表源码存于 `upstream/bento-card.registry.json`，许可证沿用 `licenses/uselayouts-MIT.txt`。

- 保留原组件共享选中背景、左侧指示条：spring / bounce 0.2 / duration 0.6。
- 保留原组件内容交接：popLayout；进入 y 8 / blur 4 / opacity 0，退出 y -8 / blur 4 / opacity 0；300ms，[0.23, 1, 0.32, 1]。
- 接入桌面功能侧栏、移动端底栏/更多、主工作区、八字与紫微的栏目切换。
- 使用项目原有图标、暖灰主题、页面内容和业务操作；无演示数据、无新图标依赖、无全站主题初始化。底栏“更多”开启时仅保留一个选中背景。
- 退出内容立即 inert，减少动态效果/键盘模式使用即时切换，动画结束清理 transform/filter，避免影响页面内部固定定位。
- 动画交接期间保留新页面元素引用，旧页面卸载仅清理自己绑定的节点，避免影响滚动定位。

验证：生产构建通过；本地浏览器使用合成命例和模拟接口验证 1440px/390px 的快速功能切换、上下文菜单开合、八字/紫微栏目、笔记保留及减少动态效果设置。独立交接验证确认退出页面不可交互，进入页面具有实际模糊过渡，退出后新页面引用仍有效。未进行 iPhone Safari 真机验证。
