/**
 * P1.5 垂直切片 · 页内真浏览器 harness
 *
 * 为什么存在：本机 DSH 沙箱禁止 Node 以 piped stdio spawn，也禁止 Chromium 创建
 * mojo 命名管道，Playwright 无法在本机启动浏览器（详见 docs/notes/P1.5-vertical-slice.md）。
 * 因此这里把同一套断言放进页面 JS，在真实 Edge/Chromium 里执行，结果：
 *   1. 渲染成页面里的 #slice-report（供截图/可访问性树读取）
 *   2. POST 到测试服务器 /__report，落盘为 JSON（精确数值证据）
 *
 * 只在 URL 带 ?slice-test=1 时由 index.astro 动态 import 启动，不影响正常页面。
 */
;(() => {
  const params = new URLSearchParams(location.search)
  if (params.get('slice-test') !== '1') return
  if (window.__sliceHarnessStarted) return
  window.__sliceHarnessStarted = true

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const S = {
    startedAt: new Date().toISOString(),
    url: location.href,
    ua: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight },
    bootNonce: Math.random().toString(36).slice(2) + '.' + Date.now(),
    results: [],
    info: [],
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    events: [],
    navEntries: [],
    stages: [],
    resourceSummary: null,
  }
  window.__slice = S
  window.__bootNonce = S.bootNonce

  // —— 采集：console error/warning、未捕获异常、Astro 生命周期事件 ——
  const origError = console.error.bind(console)
  console.error = (...args) => {
    S.consoleErrors.push(args.map((a) => String(a)).join(' '))
    origError(...args)
  }
  const origWarn = console.warn.bind(console)
  console.warn = (...args) => {
    S.consoleWarnings.push(args.map((a) => String(a)).join(' '))
    origWarn(...args)
  }
  addEventListener('error', (e) => S.pageErrors.push('error: ' + (e.message || e.type)))
  addEventListener('unhandledrejection', (e) => S.pageErrors.push('unhandledrejection: ' + String(e.reason)))
  for (const name of ['astro:before-swap', 'astro:after-swap', 'astro:page-load']) {
    document.addEventListener(name, () => S.events.push({ name, path: location.pathname, at: Math.round(performance.now()) }))
  }

  function check(name, ok, detail) {
    const item = { name, ok: Boolean(ok), detail: detail === undefined ? null : detail }
    S.results.push(item)
    console.log((ok ? '[PASS] ' : '[FAIL] ') + name + (detail === undefined ? '' : ' :: ' + JSON.stringify(detail)))
  }
  function info(name, detail) {
    S.info.push({ name, detail: detail === undefined ? null : detail })
  }

  const WEB_BG_PROPS = [
    'position', 'zIndex', 'width', 'height', 'top', 'left', 'transform',
    'backgroundColor', 'backgroundAttachment', 'backgroundPosition', 'backgroundSize', 'backgroundRepeat',
  ]
  function styleOf(el, props) {
    if (!el) return null
    const cs = getComputedStyle(el)
    const out = {}
    for (const p of props) out[p] = cs[p]
    return out
  }
  function classProbes() {
    const noteEl = document.querySelector('#note-probe')
    const postEl = document.querySelector('#recent-post-probe')
    const note = noteEl ? getComputedStyle(noteEl) : null
    const post = postEl ? getComputedStyle(postEl) : null
    const matchedCss = (() => {
      if (!postEl) return null
      const out = []
      for (const sheet of document.styleSheets) {
        let rules
        try { rules = sheet.cssRules } catch { continue }
        const walk = (ruleList, media) => {
          for (const rule of ruleList) {
            if (rule.cssRules && !rule.selectorText) {
              walk(rule.cssRules, rule.conditionText || media)
            } else if (rule.selectorText) {
              try {
                if (postEl.matches(rule.selectorText) && /flex-direction|height/.test(rule.style.cssText)) {
                  out.push({ selector: rule.selectorText, media: media || null, css: rule.style.cssText.slice(0, 180) })
                }
              } catch { /* 忽略非法选择器 */ }
            }
          }
        }
        walk(rules, null)
      }
      return out
    })()
    return {
      diagnostics: {
        innerWidth,
        innerHeight,
        devicePixelRatio,
        matchMedia768: matchMedia('(max-width: 768px)').matches,
        matchMedia1200: matchMedia('(max-width: 1200px)').matches,
        themeAttr: document.documentElement.getAttribute('data-theme'),
        bgVar: getComputedStyle(document.documentElement).getPropertyValue('--anzhiyu-background').trim(),
        recentPostRect: postEl ? { w: postEl.getBoundingClientRect().width, h: postEl.getBoundingClientRect().height } : null,
        matchedCss,
      },
      note: note
        ? {
            position: note.position, paddingTop: note.paddingTop, paddingLeft: note.paddingLeft,
            marginBottom: note.marginBottom, borderLeftWidth: note.borderLeftWidth,
            borderTopWidth: note.borderTopWidth,
            borderLeftColor: note.borderLeftColor, backgroundColor: note.backgroundColor,
          }
        : null,
      recentPost: post
        ? {
            display: post.display, flexDirection: post.flexDirection, height: post.height, width: post.width,
            fontSize: post.fontSize, borderRadius: post.borderRadius, overflow: post.overflow,
            rectWidth: postEl.getBoundingClientRect().width,
            parentWidth: postEl.parentElement ? postEl.parentElement.getBoundingClientRect().width : null,
          }
        : null,
    }
  }
  function runtimeState() {
    return {
      path: location.pathname,
      title: document.title,
      pjaxRunTotal: window.__pjaxRunTotal ?? null,
      pjaxRuns: window.__pjaxRuns ?? null,
      pjaxCompleteRuns: window.__pjaxCompleteRuns ?? null,
      homeScriptRuns: window.__homeScriptRuns ?? null,
      page2ScriptRuns: window.__page2ScriptRuns ?? null,
      page2PjaxRuns: window.__page2PjaxRuns ?? null,
      pjaxGlobalType: typeof window.pjax,
      pjaxLoadUrlType: typeof window.pjax?.loadUrl,
    }
  }
  function persistState() {
    const bg = document.querySelector('#web_bg')
    const player = document.querySelector('#music-player')
    const audio = document.querySelector('#bgm')
    return {
      sameWebBgNode: bg === window.__sliceRefs?.webBg,
      webBgMark: bg?.__sliceMark ?? null,
      webBgPersistAttr: bg?.getAttribute('data-astro-transition-persist') ?? null,
      samePlayerNode: player === window.__sliceRefs?.player,
      playerMark: player?.__sliceMark ?? null,
      playerPersistAttr: player?.getAttribute('data-astro-transition-persist') ?? null,
      sameAudioNode: audio === window.__sliceRefs?.audio,
      audioMark: audio?.__sliceMark ?? null,
      audio: audio
        ? {
            paused: audio.paused, currentTime: audio.currentTime, readyState: audio.readyState,
            duration: audio.duration, muted: audio.muted, errorCode: audio.error?.code ?? null,
          }
        : null,
    }
  }
  function navEntryCount() {
    return performance.getEntriesByType('navigation').length
  }
  function fetchEntries() {
    return performance
      .getEntriesByType('resource')
      .filter((e) => e.initiatorType === 'fetch')
      .map((e) => ({ name: e.name, initiatorType: e.initiatorType }))
  }
  function waitPageLoad(timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('等待 astro:page-load 超时')), timeoutMs)
      document.addEventListener('astro:page-load', () => { clearTimeout(timer); resolve() }, { once: true })
    })
  }
  async function clickAndWait(selector) {
    const load = waitPageLoad()
    const el = document.querySelector(selector)
    if (!el) throw new Error('找不到点击目标 ' + selector)
    el.click()
    await load
    await sleep(500) // 等 view transition/动画落定，再读 computed style
  }

  /**
   * 自动播放策略需要一个真实用户手势。这里渲染一个启动按钮，由外部（wincu 浏览器通道）
   * 真点一下，既拿到 user activation，也让测试的行为接近真实用户路径。
   */
  function waitForStartGate() {
    return new Promise((resolve) => {
      const wrap = document.createElement('div')
      wrap.id = 'slice-start-gate'
      wrap.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483646;background:#111;color:#fff;font:14px/1.5 system-ui,sans-serif;padding:14px;display:flex;gap:14px;align-items:center'
      const btn = document.createElement('button')
      btn.id = 'slice-start'
      btn.type = 'button'
      btn.textContent = '▶ 开始 P1.5 测试（授予音频播放用户手势）'
      btn.style.cssText = 'font:14px system-ui,sans-serif;padding:8px 16px;cursor:pointer;border:0;border-radius:6px;background:#425aef;color:#fff'
      const hint = document.createElement('span')
      hint.textContent = '点击后自动完成 4 次 ClientRouter 导航并在页面里输出 PASS/FAIL 报告'
      wrap.appendChild(btn)
      wrap.appendChild(hint)
      document.body.appendChild(wrap)
      btn.addEventListener('click', () => { wrap.remove(); resolve() })
    })
  }

  async function main() {
    // 初始 load / shim 模块就绪
    if (document.readyState !== 'complete') {
      await new Promise((resolve) => addEventListener('load', resolve, { once: true }))
    }
    for (let i = 0; i < 60 && !(window.__pjaxCompleteRuns?.length >= 1); i++) await sleep(100)
    await waitForStartGate()

    // ===================== 阶段 A：首页 =====================
    const initialRuntime = runtimeState()
    S.stages.push({ stage: 'A-home', runtime: initialRuntime })
    const initialWebBgStyle = styleOf(document.querySelector('#web_bg'), WEB_BG_PROPS)
    const initialClassProbes = classProbes()
    const initialNavEntries = navEntryCount()
    S.stages[0].webBgStyle = initialWebBgStyle
    S.stages[0].classProbes = initialClassProbes

    check('初始加载：路径为 /', initialRuntime.path === '/', initialRuntime.path)
    check('初始加载：标题含“首页”', String(initialRuntime.title).includes('首页'), initialRuntime.title)
    check('初次 page-load 已触发（pjax:complete shim 生效）', initialRuntime.pjaxCompleteRuns?.length === 1, initialRuntime.pjaxCompleteRuns)
    check('shim 暴露 window.pjax.loadUrl()', initialRuntime.pjaxGlobalType === 'object' && initialRuntime.pjaxLoadUrlType === 'function', {
      pjax: initialRuntime.pjaxGlobalType, loadUrl: initialRuntime.pjaxLoadUrlType,
    })
    check('初始导航条目数 = 1（未发生整页跳转）', initialNavEntries === 1, initialNavEntries)

    // #5 样式命中（首页）
    check('#web_bg position:fixed', initialWebBgStyle?.position === 'fixed', initialWebBgStyle?.position)
    check('#web_bg z-index:-999', initialWebBgStyle?.zIndex === '-999', initialWebBgStyle?.zIndex)
    check('#web_bg 背景色 = rgb(247,249,254)', initialWebBgStyle?.backgroundColor === 'rgb(247, 249, 254)', initialWebBgStyle?.backgroundColor)
    check('#web_bg transform 为 rotate(-1deg) 的 matrix', String(initialWebBgStyle?.transform).startsWith('matrix'), initialWebBgStyle?.transform)
    check('#web_bg 宽高 ≈ 200% 视口（±2px，DPR 布局取整）', Math.abs(parseFloat(initialWebBgStyle?.width) - innerWidth * 2) <= 2 && Math.abs(parseFloat(initialWebBgStyle?.height) - innerHeight * 2) <= 2, {
      width: initialWebBgStyle?.width, height: initialWebBgStyle?.height, viewport: [innerWidth, innerHeight],
    })
    check('.note position/padding/margin 命中上游', initialClassProbes.note?.position === 'relative' && initialClassProbes.note?.paddingTop === '15px' && initialClassProbes.note?.marginBottom === '20px', initialClassProbes.note)
    check('.note.icon-padding padding-left=48px 命中上游', initialClassProbes.note?.paddingLeft === '48px', initialClassProbes.note?.paddingLeft)
    check('.note.blue border-left-color=rgb(66,139,202) 命中上游', initialClassProbes.note?.borderLeftColor === 'rgb(66, 139, 202)', initialClassProbes.note?.borderLeftColor)
    check('.note.blue 背景=rgb(227,238,247) 命中上游', initialClassProbes.note?.backgroundColor === 'rgb(227, 238, 247)', initialClassProbes.note?.backgroundColor)
    const rp = initialClassProbes.recentPost
    const doubleRow = matchMedia('(min-width: 1201px)').matches
    const rpBaseOk = rp?.display === 'flex' && rp?.borderRadius === '12px' && rp?.overflow === 'hidden'
    // 上游 article_double_row:true 时，>=1201px 是「双列卡片」（column + width:49%），
    // <=1200px 才是「横排卡片」（row + height:18em）。两个分支都验，避免把配置行为当回归。
    const rpLayoutOk = doubleRow
      ? rp?.flexDirection === 'column' && Math.abs(rp.rectWidth / rp.parentWidth - 0.49) < 0.02
      : rp?.flexDirection === 'row' && Math.abs(parseFloat(rp.height) - 18 * parseFloat(rp.fontSize)) < 1
    check('.recent-post-item 命中上游（display:flex / border-radius:12px / 上游布局分支）', rpBaseOk && rpLayoutOk, { doubleRow, rp })

    // 持久节点打标
    const refs = { webBg: null, player: null, audio: null }
    const bg = document.querySelector('#web_bg')
    const player = document.querySelector('#music-player')
    const audio = document.querySelector('#bgm')
    if (bg) bg.__sliceMark = 'web_bg-initial'
    if (player) player.__sliceMark = 'player-initial'
    if (audio) audio.__sliceMark = 'audio-initial'
    refs.webBg = bg; refs.player = player; refs.audio = audio
    window.__sliceRefs = refs
    check('持久节点存在且已打 expando 标记', Boolean(bg && player && audio), {
      webBgPersistAttr: bg?.getAttribute('data-astro-transition-persist'),
      playerPersistAttr: player?.getAttribute('data-astro-transition-persist'),
    })

    // #8 音频起播（上面的启动按钮已给出真实用户手势；muted 只是为了不真的响）
    let audioBefore = null
    if (audio) {
      audio.muted = true
      let playError = null
      try { await audio.play() } catch (e) { playError = String(e) }
      if (playError) S.info.push({ name: 'audio.play() 异常', detail: playError })
      await sleep(700)
      audioBefore = { paused: audio.paused, currentTime: audio.currentTime, readyState: audio.readyState, duration: audio.duration, muted: audio.muted, playError }
    }
    check('用户手势后音频起播（play() 无异常且 currentTime 前进）', audioBefore && !audioBefore.paused && audioBefore.currentTime > 0.2, audioBefore)

    // ===================== 阶段 B：普通链接 → 第二页 =====================
    const eventsBeforeNav1 = S.events.length
    await clickAndWait('#nav-page2')
    const nav1Events = S.events.slice(eventsBeforeNav1)
    const page2Events = nav1Events
    const nav1Runtime = runtimeState()
    const nav1Persist = persistState()
    const nav1WebBgStyle = styleOf(document.querySelector('#web_bg'), WEB_BG_PROPS)
    const nav1ClassProbes = classProbes()
    const pugProbe = (() => {
      const probe = document.querySelector('#pug-probe')
      if (!probe) return null
      const img = probe.querySelector('img')
      return {
        children: probe.children.length,
        hasBr: Boolean(probe.querySelector('br')),
        hasImg: Boolean(img),
        hasInput: Boolean(probe.querySelector('input')),
        hasHr: Boolean(probe.querySelector('hr')),
        inputValue: probe.querySelector('input')?.value ?? null,
        imgComplete: img?.complete ?? null,
        imgNaturalWidth: img?.naturalWidth ?? null,
      }
    })()
    S.stages.push({ stage: 'B-page2', runtime: nav1Runtime, persist: nav1Persist, webBgStyle: nav1WebBgStyle, classProbes: nav1ClassProbes, pugProbe, events: page2Events })

    check('导航 1：路径到达 /page2/ 且标题已换', nav1Runtime.path === '/page2/' && String(nav1Runtime.title).includes('第二页'), { path: nav1Runtime.path, title: nav1Runtime.title })
    // #3
    check('#web_bg 导航后是同一个 DOM 节点（expando 仍在）', nav1Persist.sameWebBgNode === true && nav1Persist.webBgMark === 'web_bg-initial', { sameNode: nav1Persist.sameWebBgNode, mark: nav1Persist.webBgMark })
    check('#web_bg persist 属性保持不变', nav1Persist.webBgPersistAttr !== null && nav1Persist.webBgPersistAttr === bg?.getAttribute('data-astro-transition-persist'), { initial: bg?.getAttribute('data-astro-transition-persist'), after: nav1Persist.webBgPersistAttr })
    check('#web_bg computed style 导航前后逐属性一致', JSON.stringify(initialWebBgStyle) === JSON.stringify(nav1WebBgStyle), JSON.stringify(initialWebBgStyle) === JSON.stringify(nav1WebBgStyle) ? initialWebBgStyle : { before: initialWebBgStyle, after: nav1WebBgStyle })
    // #8
    check('#music-player 导航后是同一个 DOM 节点', nav1Persist.samePlayerNode === true && nav1Persist.playerMark === 'player-initial', { sameNode: nav1Persist.samePlayerNode, mark: nav1Persist.playerMark })
    check('#bgm audio 导航后是同一个 DOM 节点', nav1Persist.sameAudioNode === true && nav1Persist.audioMark === 'audio-initial', { sameNode: nav1Persist.sameAudioNode, mark: nav1Persist.audioMark })
    check('音频导航后未中断（paused=false 且 currentTime 单调不减）', Boolean(nav1Persist.audio) && nav1Persist.audio.paused === false && nav1Persist.audio.currentTime >= audioBefore.currentTime, { before: audioBefore, after: nav1Persist.audio })
    // #4
    check('data-pjax（全局）导航 1 后执行次数 = 2', nav1Runtime.pjaxRunTotal === 2, nav1Runtime.pjaxRunTotal)
    check('data-pjax 执行路径序列 = ["/", "/page2/"]', JSON.stringify((nav1Runtime.pjaxRuns || []).map((r) => r.path)) === JSON.stringify(['/', '/page2/']), (nav1Runtime.pjaxRuns || []).map((r) => r.path))
    check('旧页脚本（首页）未重复执行：__homeScriptRuns=1', nav1Runtime.homeScriptRuns === 1, nav1Runtime.homeScriptRuns)
    check('新页脚本（第二页）首次进入执行一次：__page2ScriptRuns=1', nav1Runtime.page2ScriptRuns === 1, nav1Runtime.page2ScriptRuns)
    check('页级 data-pjax 脚本首次进入执行一次：__page2PjaxRuns=1', nav1Runtime.page2PjaxRuns === 1, nav1Runtime.page2PjaxRuns)
    check('astro:before-swap / after-swap / page-load 各触发一次', ['astro:before-swap', 'astro:after-swap', 'astro:page-load'].every((n) => page2Events.filter((e) => e.name === n).length === 1), page2Events)
    check('导航 1 后导航条目数仍 = 1（无新 document 导航）', navEntryCount() === 1, navEntryCount())
    info('导航 1 的 fetch 资源条目', fetchEntries())
    // #5/#6
    // 上游 .note.simple 是 border:1px + border-left-width:5px。Chromium 会把边框宽度
    // 吸附到整数设备像素，DPR=1.5 时 5px→4.66667、1px→0.66667。按 floor(css*dpr)/dpr 复核。
    const dpr = devicePixelRatio
    const snapped = (cssPx) => Math.floor(cssPx * dpr) / dpr
    const noteBorderLeft = parseFloat(nav1ClassProbes.note?.borderLeftWidth)
    const noteBorderTop = parseFloat(nav1ClassProbes.note?.borderTopWidth)
    check('第二页 .note.red.simple border 命中上游（5px/1px，按 DPR 设备像素吸附复核）', Boolean(nav1ClassProbes.note) && Math.abs(noteBorderLeft - snapped(5)) < 0.02 && Math.abs(noteBorderTop - snapped(1)) < 0.02, { dpr, expectedLeft: snapped(5), expectedTop: snapped(1), ...nav1ClassProbes.note })
    check('pug 探针：br/img/input/hr 全部解析进 DOM', Boolean(pugProbe) && pugProbe.hasBr && pugProbe.hasImg && pugProbe.hasInput && pugProbe.hasHr, pugProbe)
    check('pug 探针：input value="pug" 生效', pugProbe?.inputValue === 'pug', pugProbe?.inputValue)
    check('pug 探针：img 正常加载（naturalWidth>0）', (pugProbe?.imgNaturalWidth ?? 0) > 0, { complete: pugProbe?.imgComplete, naturalWidth: pugProbe?.imgNaturalWidth })

    // ===================== 阶段 C：返回首页 =====================
    await clickAndWait('#back-home')
    const nav2Runtime = runtimeState()
    const nav2Persist = persistState()
    S.stages.push({ stage: 'C-home-returned', runtime: nav2Runtime, persist: nav2Persist })
    check('导航 2（返回首页）：路径为 /', nav2Runtime.path === '/', nav2Runtime.path)
    check('导航 2：data-pjax（全局）执行次数 = 3', nav2Runtime.pjaxRunTotal === 3, nav2Runtime.pjaxRunTotal)
    check('导航 2：旧页脚本（第二页）未重复执行：__page2ScriptRuns=1', nav2Runtime.page2ScriptRuns === 1, nav2Runtime.page2ScriptRuns)
    check('导航 2：页级 data-pjax 未跨页重复执行：__page2PjaxRuns=1', nav2Runtime.page2PjaxRuns === 1, nav2Runtime.page2PjaxRuns)
    check('导航 2：首页页面级脚本按内容去重，仍为 1 次', nav2Runtime.homeScriptRuns === 1, nav2Runtime.homeScriptRuns)
    check('导航 2：#web_bg 仍是同一个节点', nav2Persist.sameWebBgNode && nav2Persist.webBgMark === 'web_bg-initial', { sameNode: nav2Persist.sameWebBgNode, mark: nav2Persist.webBgMark })
    check('导航 2：音频仍未中断', Boolean(nav2Persist.audio) && nav2Persist.audio.paused === false && nav2Persist.audio.currentTime >= audioBefore.currentTime, nav2Persist.audio)
    check('导航 2 后导航条目数仍 = 1', navEntryCount() === 1, navEntryCount())

    // ===================== 阶段 D：pjax shim 调用 =====================
    await clickAndWait('#shim-page2')
    const nav3Runtime = runtimeState()
    const nav3Persist = persistState()
    S.stages.push({ stage: 'D-page2-shim', runtime: nav3Runtime, persist: nav3Persist })
    check('pjax.loadUrl 导航：到达 /page2/', nav3Runtime.path === '/page2/', nav3Runtime.path)
    check('pjax.loadUrl 导航：全局 data-pjax 执行次数 = 4', nav3Runtime.pjaxRunTotal === 4, nav3Runtime.pjaxRunTotal)
    check('pjax.loadUrl 导航：pjax:complete 共 4 次（每次 page-load 一次）', nav3Runtime.pjaxCompleteRuns?.length === 4, nav3Runtime.pjaxCompleteRuns)
    check('第二次进入第二页：data-astro-rerun 让页级 pjax 脚本再执行一次（=2）', nav3Runtime.page2PjaxRuns === 2, nav3Runtime.page2PjaxRuns)
    check('第二次进入第二页：无 rerun 的页面脚本仍按内容去重（=1）', nav3Runtime.page2ScriptRuns === 1, nav3Runtime.page2ScriptRuns)
    check('#web_bg 在 pjax.loadUrl 路径下也仍是同一个节点', nav3Persist.sameWebBgNode && nav3Persist.webBgMark === 'web_bg-initial', { sameNode: nav3Persist.sameWebBgNode, mark: nav3Persist.webBgMark })
    check('音频在 pjax.loadUrl 路径下仍未中断', Boolean(nav3Persist.audio) && nav3Persist.audio.paused === false, nav3Persist.audio)
    check('全部导航后导航条目数仍 = 1（无 document 导航）', navEntryCount() === 1, navEntryCount())

    // ===================== 阶段 E：重复监听计数 + 汇总 =====================
    window.__pjaxProbeHits = 0
    document.dispatchEvent(new Event('pjax:probe'))
    const probeHits = window.__pjaxProbeHits
    info('重复监听累加：dispatch 一次 pjax:probe 命中数（= data-pjax 全局脚本执行次数，说明 document 监听会随重执行累加）', probeHits)

    const consoleErrors = S.consoleErrors.slice()
    check('导航全流程 console error = 0', consoleErrors.length === 0, consoleErrors)
    check('导航全流程 pageerror = 0', S.pageErrors.length === 0, S.pageErrors)
    check('导航全流程无 console warning', S.consoleWarnings.length === 0, S.consoleWarnings)
    S.resourceSummary = {
      navigationEntries: navEntryCount(),
      fetchEntries: fetchEntries(),
      initialNavEntries,
    }
    info('资源时间线摘要', S.resourceSummary)
  }

  function renderReport() {
    const failed = S.results.filter((r) => !r.ok)
    const lines = []
    lines.push('== ' + 'P1.5 SUMMARY PASS=' + (S.results.length - failed.length) + ' FAIL=' + failed.length + ' ==')
    lines.push('P1.5 VERTICAL SLICE / REAL BROWSER HARNESS')
    lines.push('UA ' + S.ua)
    lines.push('VIEWPORT ' + S.viewport.w + 'x' + S.viewport.h + '  BOOT ' + S.bootNonce)
    lines.push('')
    for (const r of S.results) {
      lines.push((r.ok ? '[PASS] ' : '[FAIL] ') + r.name + (r.detail === null ? '' : ' :: ' + JSON.stringify(r.detail).slice(0, 180)))
    }
    lines.push('')
    lines.push('--- INFO ---')
    for (const i of S.info) lines.push('[INFO] ' + i.name + ' :: ' + JSON.stringify(i.detail).slice(0, 240))
    lines.push('--- CONSOLE ERRORS (' + S.consoleErrors.length + ') ---')
    for (const e of S.consoleErrors) lines.push(e.slice(0, 300))
    lines.push('--- CONSOLE WARNINGS (' + S.consoleWarnings.length + ') ---')
    for (const e of S.consoleWarnings) lines.push(e.slice(0, 300))
    lines.push('--- PAGE ERRORS (' + S.pageErrors.length + ') ---')
    for (const e of S.pageErrors) lines.push(e.slice(0, 300))
    lines.push('')
    lines.push('SUMMARY PASS=' + (S.results.length - failed.length) + ' FAIL=' + failed.length)
    const panel = document.createElement('div')
    panel.id = 'slice-report-panel'
    panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#ffffff;overflow:auto;font:12px/1.4 Consolas,monospace;padding:10px;color:#111;white-space:pre'
    const pre = document.createElement('pre')
    pre.id = 'slice-report'
    pre.style.cssText = 'margin:0;white-space:pre-wrap'
    pre.textContent = lines.join('\n')
    panel.appendChild(pre)
    document.body.appendChild(panel)
    window.__sliceReportText = pre.textContent
    window.__sliceSummary = lines[lines.length - 1]
    window.__sliceDone = true
    document.title = '[SLICE] ' + window.__sliceSummary
  }

  async function postReport() {
    try {
      await fetch('/__report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(S),
      })
      S.reportPosted = true
    } catch (e) {
      S.reportPosted = false
      S.postError = String(e)
    }
  }

  main()
    .then(async () => {
      S.ok = true
      renderReport()
      await postReport()
    })
    .catch(async (error) => {
      S.ok = false
      S.fatalError = String(error && error.stack ? error.stack : error)
      renderReport()
      await postReport()
    })
})()
