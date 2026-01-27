<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 项目简介

这是一个占卜与命理一体化的专业分析应用，聚焦奇门遁甲与四柱八字两大核心板块，并通过专业排盘与定制提示词，为大语言模型提供高质量、可溯源的推断支撑。

![项目封面](assets/images/title.png)

![功能类别](assets/images/classes.png)

## 项目特色

1. 覆盖占卜与命理两大板块，其中占卜主推奇门遁甲，命理主推四柱八字。
2. 调用专业排盘 API「缘份居」，提供专业起卦与排盘能力。
3. 针对不同板块进行专业提示词构建，提升模型推断准确度与一致性。
4. 奇门遁甲与四柱八字构建专业知识库，让大语言模型能够参考真实案例。
5. 支持导出专业命理报告。
6. 四柱八字支持人生 K 线分析。

## 功能配图

### 奇门遁甲（占卜）

![奇门遁甲](assets/images/qimen.png)

### 四柱八字（命理）

![四柱八字](assets/images/bazi.png)

### 专业排盘结果

![排盘](assets/images/bazipaipan.png)

### 专业命理报告导出

![命理报告](assets/images/report.png)

### 人生 K 线分析

![人生 K 线 - 1](assets/images/k-line1.png)
![人生 K 线 - 2](assets/images/k-line2.png)
![人生 K 线 - 结果](assets/images/k-line-result.png)

## Demo

`https://zhijie123.online/`

## 本地部署

1. Install dependencies:
   `npm install`
2. Set environment variables in `.env.local`:
   - `DEEPSEEK_API_KEY=your_deepseek_api_key`
   - `YUANFENJU_API_KEY=your_yuanfenju_api_key`
3. Run the app:
   `npm run dev`
