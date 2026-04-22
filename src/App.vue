<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue'
import TabNav from './components/TabNav.vue'
import LoveStory from './components/LoveStory.vue'
import PhotoFeed from './components/PhotoFeed.vue'
import LoveLetters from './components/LoveLetters.vue'
import HeartSurprise from './components/HeartSurprise.vue'
import HeartGridOverlay from './components/HeartGridOverlay.vue'
import PixelHeartWidget from './components/PixelHeartWidget.vue'

const base = import.meta.env.BASE_URL

const activeTab = ref('home')
const audioRef = ref(null)
const musicOn = ref(true)
const bgmSrc = `${base}music/love.mp3`
/** 小爱心（SVG）惊喜，快捷键 H */
const heartSurpriseOpen = ref(false)
/** 全屏心形照片墙；桌面 Esc、移动端点右下角「墙」或下方按钮 */
const heartGridOpen = ref(false)
const loveStoryRef = ref(null)
/** 与首页故事同步，供右下角像素爱心高亮 */
const storyPageIndex = ref(0)
const storyTotal = ref(0)

/** 触屏设备不自动隐藏底栏；鼠标设备靠近底边显示，离开延迟隐藏（类似 macOS Dock） */
const chromeAutoHide = ref(true)
const chromeVisible = ref(true)
let chromeHideTimer = null

const showChrome = computed(() => !chromeAutoHide.value || chromeVisible.value)

provide('showChrome', showChrome)

function clearChromeHideTimer() {
  if (chromeHideTimer != null) {
    clearTimeout(chromeHideTimer)
    chromeHideTimer = null
  }
}

function onChromeMouseMove(e) {
  if (!chromeAutoHide.value) return
  const h = window.innerHeight
  if (e.clientY > h - 110) {
    chromeVisible.value = true
    clearChromeHideTimer()
  } else {
    clearChromeHideTimer()
    chromeHideTimer = window.setTimeout(() => {
      chromeVisible.value = false
      chromeHideTimer = null
    }, 900)
  }
}

function onDockHitEnter() {
  if (!chromeAutoHide.value) return
  chromeVisible.value = true
  clearChromeHideTimer()
}

function toggleHeartSurprise() {
  heartSurpriseOpen.value = !heartSurpriseOpen.value
}

function toggleHeartGrid() {
  heartGridOpen.value = !heartGridOpen.value
}

let mqPointer = null

function syncChromePointer() {
  if (!mqPointer) return
  chromeAutoHide.value = !mqPointer.matches
  if (!chromeAutoHide.value) chromeVisible.value = true
}

function onGlobalKeydown(e) {
  if (e.key === 'Escape') {
    if (document.querySelector('.feed__lb')) return
    if (document.querySelector('.heart-grid__lb')) return
    e.preventDefault()
    toggleHeartGrid()
    return
  }
  if (e.key === 'h' || e.key === 'H') {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
    e.preventDefault()
    toggleHeartSurprise()
  }
}

onMounted(() => {
  mqPointer = window.matchMedia('(pointer: coarse)')
  syncChromePointer()
  mqPointer.addEventListener?.('change', syncChromePointer)

  window.addEventListener('mousemove', onChromeMouseMove)
  window.addEventListener('keydown', onGlobalKeydown)
  const el = audioRef.value
  if (!el) return
  el.volume = 0.45
  const p = el.play()
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      musicOn.value = false
    })
  }
})

onUnmounted(() => {
  mqPointer?.removeEventListener?.('change', syncChromePointer)
  window.removeEventListener('mousemove', onChromeMouseMove)
  clearChromeHideTimer()
  window.removeEventListener('keydown', onGlobalKeydown)
})

watch(musicOn, (on) => {
  const el = audioRef.value
  if (!el) return
  if (on) {
    el.play().catch(() => {})
  } else {
    el.pause()
  }
})

function toggleMusic() {
  musicOn.value = !musicOn.value
}

function onStoryUpdate({ page, total }) {
  storyPageIndex.value = page
  storyTotal.value = total
}

/** 点击格子 → 跳到对应故事页（与下键翻页同一套页码） */
function onPixelSelectPage({ pageIndex }) {
  activeTab.value = 'home'
  nextTick(() => {
    loveStoryRef.value?.goToPage(pageIndex)
  })
}
</script>

<template>
  <div class="app">
    <main class="app__main">
      <LoveStory
        ref="loveStoryRef"
        v-show="activeTab === 'home'"
        :active="activeTab === 'home'"
        @story-update="onStoryUpdate"
      />
      <PhotoFeed v-show="activeTab === 'feed'" />
      <LoveLetters v-show="activeTab === 'letters'" />
    </main>

    <TabNav v-model="activeTab" :chrome-visible="showChrome" />

    <!-- 底边感应条：导航收起后鼠标移入可唤出 -->
    <div
      v-if="chromeAutoHide"
      class="app__dock-hit"
      aria-hidden="true"
      @mouseenter="onDockHitEnter"
    />

    <audio
      id="bgmMusic"
      ref="audioRef"
      class="app__audio"
      :src="bgmSrc"
      loop
      preload="auto"
    />

    <!-- 左下：小爱心惊喜（无衬底，仅图标）；右下：♪ + 像素爱心 -->
    <button
      v-show="activeTab === 'home'"
      type="button"
      class="app__heart"
      title="小爱心惊喜 · 按 H"
      aria-label="小爱心惊喜"
      @click="toggleHeartSurprise"
    >
      <span class="app__heart-icon" aria-hidden="true">♥</span>
    </button>

    <div
      v-show="activeTab === 'home'"
      class="app__fab"
      aria-label="心形墙与音乐"
    >
      <div class="app__grid-wrap">
        <p class="app__grid-hint" aria-hidden="true">点击有惊喜</p>
        <button
          type="button"
          class="app__grid-fab"
          :class="{ 'app__grid-fab--open': heartGridOpen }"
          :title="heartGridOpen ? '点按关贴心形墙（电脑可按 Esc）' : '心形照片墙，点击有惊喜（电脑可按 Esc）'"
          :aria-label="heartGridOpen ? '关贴心形照片墙' : '打开心形照片墙，点击有惊喜'"
          :aria-pressed="heartGridOpen"
          @click="toggleHeartGrid"
        >
          <span class="app__grid-fab__icon" aria-hidden="true">♡</span>
          <span class="app__grid-fab__text">照片墙</span>
        </button>
      </div>
      <PixelHeartWidget
        :music-on="musicOn"
        :story-page-index="storyPageIndex"
        :story-total="storyTotal"
        @toggle-music="toggleMusic"
        @select-page="onPixelSelectPage"
      />
    </div>

    <HeartSurprise v-model="heartSurpriseOpen" />
    <HeartGridOverlay v-model="heartGridOpen" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  width: 100%;
}

.app__main {
  min-height: 100vh;
  min-height: 100dvh;
}

.app__audio {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.app__dock-hit {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 22px;
  z-index: 115;
  pointer-events: auto;
}

.app__fab {
  position: fixed;
  right: max(14px, env(safe-area-inset-right));
  bottom: calc(88px + var(--safe-bottom));
  z-index: 300;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 10px;
  pointer-events: auto;
}

/* 心形照片墙入口：仅移动端显示；桌面用 Esc */
.app__grid-wrap {
  display: none;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  margin: 0 0 1px;
}

@media (max-width: 768px) {
  .app__grid-wrap {
    display: flex;
  }
}

.app__grid-hint {
  margin: 0;
  padding: 0 2px;
  max-width: 7em;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.06em;
  text-align: right;
  color: rgba(255, 240, 248, 0.92);
  text-shadow:
    0 0 8px rgba(255, 100, 150, 0.55),
    0 1px 2px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.app__grid-fab {
  flex-shrink: 0;
  min-width: 44px;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px 8px 10px;
  border: 1px solid rgba(255, 200, 220, 0.42);
  border-radius: 999px;
  background:
    linear-gradient(145deg, rgba(196, 85, 140, 0.35) 0%, rgba(60, 18, 40, 0.75) 45%, rgba(25, 8, 18, 0.88) 100%);
  color: #ffe8f0;
  font-size: 0;
  cursor: pointer;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 6px 20px rgba(0, 0, 0, 0.35),
    0 0 24px rgba(255, 100, 150, 0.18);
  transition:
    transform 0.15s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.app__grid-fab__icon {
  font-size: 16px;
  line-height: 1;
  color: #ffb3d0;
  text-shadow: 0 0 10px rgba(255, 120, 170, 0.9);
}

.app__grid-fab__text {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  padding-bottom: 1px;
}

.app__grid-fab--open {
  border-color: rgba(255, 230, 240, 0.65);
  background:
    linear-gradient(145deg, rgba(255, 140, 180, 0.45) 0%, rgba(90, 30, 60, 0.82) 100%);
  color: #fff;
  box-shadow:
    0 0 0 1px rgba(255, 200, 220, 0.35) inset,
    0 8px 28px rgba(255, 60, 120, 0.4);
  filter: brightness(1.05);
}

.app__grid-fab--open .app__grid-fab__icon {
  color: #fff5f8;
}

.app__grid-fab:active {
  transform: scale(0.96);
}

.app__grid-fab:focus {
  outline: none;
}

.app__grid-fab:focus-visible {
  outline: 2px solid rgba(255, 200, 220, 0.9);
  outline-offset: 2px;
}

/* 与右下音乐区同一基线，贴在安全区内侧 */
.app__heart {
  position: fixed;
  left: max(10px, env(safe-area-inset-left), var(--safe-left));
  bottom: calc(88px + var(--safe-bottom));
  right: auto;
  top: auto;
  z-index: 300;
  width: 48px;
  height: 48px;
  margin: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  color: inherit;
  transition: transform 0.18s ease, opacity 0.2s ease;
}

.app__heart:focus {
  outline: none;
}

.app__heart:focus-visible {
  outline: 2px solid rgba(255, 160, 195, 0.75);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .app__heart-icon {
    animation: none;
  }
}

.app__heart-icon {
  display: block;
  font-size: 30px;
  line-height: 1;
  color: #ff7eb8;
  text-shadow:
    0 0 14px rgba(255, 100, 160, 1),
    0 0 32px rgba(255, 60, 120, 0.65);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
  transform-origin: center 60%;
  animation: app-heart-beat 1.15s cubic-bezier(0.45, 0, 0.2, 1) infinite;
}

@keyframes app-heart-beat {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }
  9% {
    transform: scale(1.48) translateY(-3px);
  }
  18% {
    transform: scale(1) translateY(0);
  }
  27% {
    transform: scale(1.32) translateY(-2px);
  }
  38% {
    transform: scale(1) translateY(0);
  }
}

.app__heart:hover .app__heart-icon {
  color: #ffb3d5;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25)) brightness(1.08);
}

.app__heart:active {
  transform: scale(0.9);
  opacity: 0.92;
}

@media (max-width: 480px) {
  .app__heart {
    left: max(8px, var(--safe-left));
    bottom: calc(86px + var(--safe-bottom));
    width: 46px;
    height: 46px;
  }

  .app__heart-icon {
    font-size: 28px;
  }

  .app__fab {
    right: max(8px, var(--safe-right));
    bottom: calc(86px + var(--safe-bottom));
  }

  .app__grid-hint {
    font-size: 10px;
    max-width: none;
  }

  .app__grid-fab {
    padding: 7px 10px 7px 8px;
  }

  .app__grid-fab__text {
    font-size: 12px;
  }
}
</style>
