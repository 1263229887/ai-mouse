<template>
  <svg
    class="mouse-diagram"
    :width="width"
    :height="height"
    viewBox="0 0 600 600"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- 鼠标主体轮廓 -->
    <path
      d="M426.193 254.106C421.205 146.563 352.525 122.644 309.905 124.35C309.389 124.37 308.999 124.777 309.01 125.294C310.824 207.913 314.328 373.848 313.996 383.821C313.664 393.768 305.893 396.851 301.975 397.163C301.924 397.167 301.877 397.166 301.826 397.162C289.422 396.045 263.182 393.243 256.854 390.912C250.515 388.576 248.652 382.709 248.513 380.068L250.174 126.24C250.178 125.69 249.691 125.252 249.142 125.286C147.106 131.659 139.216 219.532 133.813 248.215C128.39 276.994 126.722 418.44 135.064 464.767C142.572 512.286 171.094 579.02 288.97 578.186C401.5 577.39 424.459 485.438 426.662 461.817C427.161 456.467 432.566 391.494 426.193 254.106Z"
      class="stroke-line"
      stroke-width="2.28899"
    />
    <path
      d="M302.189 123.27C303.857 123.244 305.231 124.572 305.263 126.24L310.092 384.399C310.173 388.781 306.352 392.219 302.003 391.675L260.322 386.464C255.864 385.907 252.527 382.104 252.556 377.611L254.159 127.798C254.173 125.7 255.86 123.996 257.959 123.963L302.189 123.27Z"
      class="stroke-line"
      stroke-width="2.28899"
      stroke-linejoin="round"
    />

    <!-- 指示灯 -->
    <rect
      x="279.686"
      y="132.906"
      width="1.66837"
      height="15.8495"
      rx="0.834184"
      class="stroke-highlight"
      stroke-width="1.66837"
    />
    <rect
      x="279.686"
      y="156.263"
      width="1.66837"
      height="7.50765"
      rx="0.834184"
      class="stroke-highlight"
      stroke-width="1.66837"
    />
    <rect
      x="290.177"
      y="144.584"
      width="1.66837"
      height="11.6786"
      rx="0.834184"
      class="stroke-highlight"
      stroke-width="1.66837"
    />
    <rect
      x="268.402"
      y="155.428"
      width="1.66837"
      height="7.50765"
      rx="0.834184"
      class="stroke-highlight"
      stroke-width="1.66837"
    />
    <rect
      x="268.402"
      y="139.579"
      width="1.66837"
      height="7.50765"
      rx="0.834184"
      class="stroke-highlight"
      stroke-width="1.66837"
    />

    <!-- 滚轮外框 -->
    <rect
      x="264.144"
      y="174.144"
      width="32.711"
      height="67.711"
      rx="10.8555"
      class="stroke-line"
      stroke-width="2.28899"
    />

    <!-- 滚轮内部高亮 -->
    <g filter="url(#filter0_d_266_398)">
      <rect
        x="270.2"
        y="178.2"
        width="20.6"
        height="58.6"
        rx="10.3"
        class="stroke-highlight"
        stroke-width="2.4"
        shape-rendering="crispEdges"
      />
    </g>

    <!-- 侧键 -->
    <path
      d="M268.005 277H292.995C295.207 277 297 278.793 297 281.005V316.406C297 318.794 294.925 320.651 292.552 320.387L267.562 317.604C265.534 317.378 264 315.663 264 313.623V281.005C264 278.793 265.793 277 268.005 277Z"
      class="stroke-highlight"
      stroke-width="2"
    />
    <path
      d="M264 330.723C264 328.299 266.137 326.431 268.539 326.754L293.528 330.112C295.516 330.38 297 332.076 297 334.082V367.277C297 369.701 294.863 371.569 292.461 371.246L267.472 367.888C265.484 367.62 264 365.924 264 363.918V330.723Z"
      class="stroke-highlight"
      stroke-width="2"
    />

    <!-- 虚线标注 -->
    <path d="M28 156L188 156" class="stroke-line" stroke-width="2" stroke-dasharray="2 2" />
    <path d="M371 156L531 156" class="stroke-line" stroke-width="2" stroke-dasharray="2 2" />
    <path d="M280 70L280 120" class="stroke-line" stroke-width="2" stroke-dasharray="2 2" />
    <path d="M299 223L582 223" class="stroke-line" stroke-width="2" stroke-dasharray="2 2" />
    <path d="M299 351L550 351" class="stroke-line" stroke-width="2" stroke-dasharray="2 2" />
    <path d="M18 293L261 293" class="stroke-line" stroke-width="2" stroke-dasharray="2 2" />

    <!-- 文字标注 - 鼠标左键 -->
    <text x="35" y="116" class="fill-text label-text">鼠标左键</text>
    <text x="29" y="135" class="fill-text label-text-en">Left mouse button</text>

    <!-- 文字标注 - 鼠标右键 -->
    <text x="483" y="116" class="fill-text label-text">鼠标右键</text>
    <text x="475" y="135" class="fill-text label-text-en">Right mouse button</text>

    <!-- 文字标注 - TYPE-C充电口 -->
    <text x="194" y="34" class="fill-text label-text" text-anchor="middle">
      TYPE-C充电口/充电指示灯
    </text>
    <text x="194" y="53" class="fill-text label-text-en" text-anchor="middle">
      Type-C charging port/charging indicator light
    </text>

    <!-- 文字标注 - 滚轮键 -->
    <text x="535" y="180" class="fill-text label-text">滚轮键</text>
    <text x="535" y="199" class="fill-text label-text-en">Scroll wheel button</text>

    <!-- 文字标注 - 语音键 -->
    <text x="28" y="250" class="fill-text label-text">语音键</text>
    <text x="28" y="269" class="fill-text label-text-en">Voice button</text>

    <!-- 文字标注 - AI键 -->
    <text x="535" y="300" class="fill-text label-text">AI键</text>
    <text x="535" y="319" class="fill-text label-text-en">AI key</text>

    <!-- 滤镜定义 -->
    <defs>
      <filter
        id="filter0_d_266_398"
        x="265.663"
        y="177"
        width="29.6735"
        height="67.6735"
        filterUnits="userSpaceOnUse"
        color-interpolation-filters="sRGB"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <feOffset dy="3.33673" />
        <feGaussianBlur stdDeviation="1.66837" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_266_398" />
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_266_398" result="shape" />
      </filter>
    </defs>
  </svg>
</template>

<script setup>
defineProps({
  width: {
    type: [String, Number],
    default: '100%'
  },
  height: {
    type: [String, Number],
    default: '100%'
  }
})
</script>

<style lang="scss" scoped>
.mouse-diagram {
  display: block;
  transition: all 0.3s ease;

  // 灰色线条 - 使用主题变量
  .stroke-line {
    stroke: var(--text-secondary);
    transition: stroke 0.3s ease;
  }

  // 绿色高亮 - 保持品牌绿色
  .stroke-highlight {
    stroke: #8be6b0;
    transition: stroke 0.3s ease;
  }

  // 文字填充 - 使用主题变量
  .fill-text {
    fill: var(--text-primary);
    transition: fill 0.3s ease;
  }

  // 中文标签文字
  .label-text {
    font-family:
      'PingFang SC',
      -apple-system,
      BlinkMacSystemFont,
      sans-serif;
    font-size: 14px;
    font-weight: 400;
  }

  // 英文标签文字
  .label-text-en {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11px;
    font-weight: 400;
    fill: var(--text-secondary);
  }
}
</style>
