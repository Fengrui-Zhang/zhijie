-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "announcementTitle" TEXT NOT NULL,
    "announcementUpdatedAt" TEXT NOT NULL,
    "announcementItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "announcementContent" TEXT NOT NULL DEFAULT '',
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "registrationClosedContact" TEXT NOT NULL DEFAULT '微信：zixu9498422',
    "guestModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteSettings" (
    "id",
    "announcementTitle",
    "announcementUpdatedAt",
    "announcementItems",
    "announcementContent",
    "registrationEnabled",
    "registrationClosedContact",
    "guestModeEnabled",
    "createdAt",
    "updatedAt"
) VALUES (
    'global',
    '新增功能',
    '2026-03-07',
    ARRAY[
      '全局界面升级为毛玻璃 UI，整体观感更统一，交互层次更清晰',
      '新增账号功能：每个新注册账号赠送 30 次分析额度，包含追问次数',
      '优化提示词并更新知识库，解读输出更稳定，结果更可靠',
      '新增历史记录功能，可自动保存近 15 天的排盘与对话内容',
      '新增笔记功能，支持随手记录思路与重点，内容可持续编辑',
      '导出报告功能继续优化，排盘信息与对话整理更完整，便于保存与回看'
    ]::TEXT[],
    '',
    true,
    '微信：zixu9498422',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
