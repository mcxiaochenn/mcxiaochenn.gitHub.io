/** Website 分类配置 */
const WEBSITE_SORTS: WebsiteSort[] = [
  {
    title: "Github项目",
    sites: [
      {
        title: "尘的Github主页",
        url: "https://github.com/mcxiaochenn",
        icon: "https://avatars.githubusercontent.com/u/130777336",
        color: "#0171CD",
      },
      {
        title: "为爱发电",
        description: "这么做也是为了我的项目能活的更加长久哦～",
        url: "https://github.com/mcxiaochenn/mcxiaochenn/blob/main/aifadian.md",
        icon: "",
      },
      {
        title: "Oneplus Kernel Image",
        description: "使用GA编译一加KSU分支内核并发布构建",
        url: "https://github.com/mcxiaochenn/Action_OKI_KernelSU_SUSFS",
        icon: "",
      },
      {
        title: "音乐解锁",
        description: "移除已购音乐的加密保护。",
        url: "https://mcxiaochen.top/musicunlock/index.html",
        icon: "musicunlock/img/icons/favicon-32x32.png",
      },
    ],
  },
  {
    title: "关于我的",
    sites: [
      {
        title: "Bilibili",
        description: "Bilibili 哔哩哔哩: 等等是小尘",
        url: "https://space.bilibili.com/123757127",
        icon: "images/logo/bilibili.svg",
      },
      {
        title: "CoolApk",
        description: "CoolApk 酷安: 我不是尘桑",
        url: "https://www.coolapk.com/u/21508887",
        icon: "images/logo/coolapk.svg",
      },
      {
        title: "Github",
        description: "Github: mcxiaochenn",
        url: "https://github.com/mcxiaochenn",
        icon: "images/logo/github.svg",
      },
    ]
  },
  {
    title: "玩机常用资源",
    sites: [
      {
        title: "酷安 CoolApk",
        description: "玩机必备！查查教程随便逛逛都很好",
        url: "https://www.coolapk.com/",
        icon: "images/logo/coolapk.svg",
      },
      {
        title: "大侠阿木-一加全能盒子",
        description: "可以一键刷面具、apatch、ksu的神仙软件",
        url: "https://optool.daxiaamu.com/optool",
        icon: "",
      },
      {
        title: "大侠阿木-一加刷机包",
        description: "一加刷机包大全",
        url: "https://yun.daxiaamu.com/OnePlus_Roms/",
        icon: "",
      },
      {
        title: "搞机助手",
        description: "本人的入坑工具，新手必备，麻雀虽小但五脏俱全", 
        url: "https://lsdy.top/gjzs",
        icon: "",
      },
      {
        title: "安卓驱动下载",
        description: "正如标题的安卓驱动", 
        url: "https://lsdy.top/azqddownload",
        icon: "",
      },
    ]
  },
  {
    title: "友情链接",
    sites: [
      {
        title: "EsunR Blog",
        description: "EsunR 的博客",
        url: "https://www.esunr.xyz",
        icon: "images/logo/EsunR-Blog.jpg",
      },
      {
        title: "Google",
        description: "好用的搜索引擎",
        url: "https://www.google.com",
        icon: "images/logo/googleg_standard_color.png",
      },
      {
        title: "ChatGPT",
        description: "好用的AI, 你提需求, 让ta帮你写",
        url: "https://chatgpt.com/",
        icon: "images/logo/chatgpt.webp",
      },
    ],
  },
];

/** Website 配置（2023.3.29 已废弃） */
const WEBSITE_ITEMS: WebsiteItem[] = [];

const GLOBAL_CONFIG = {
  /**
   * 博客名称
   */
  BLOG_NAME: "Xiaochen's Blog",
  /**
   * 个人博客链接
   */
  BLOG_URL: "https://mcxiaochen.top/blog",
  /**
   * 指定中心 LOGO 图片地址
   */
  LOGO_URL: null,
  /**
   * 个人 Github 链接
   */
  GITHUB_URL: "https://github.com/mcxiaochenn",
  /**
   * 背景图片地址
   */
  BACKGROUND_IMG_URL: "https://www.loliapi.com/acg/",
  /**
   * ICP 备案号，留空不显示
   */
  ICP: "因IKUN证114514号",
  ICP_URL: "https://mcxiaochen.top/CXK/index.html",
  FOOTER_INFO: true,
  /**
   * 网站欢迎标语
   */
  SLOGANS: [
    "欢迎拜访",
    "歡迎拜訪",
    "Welcome, my friend!",
    "訪問へようこそ",
    "嗨，别来无恙",
    "不忘初心，一生浪漫",
    "最近还好吗？",
    "流星，落花，萤火",
    "马车越空，晃荡越响",
    "有志不在年高，无谋空长百岁。",
    "嘿，别来无恙啊",
    "坐和放宽"
  ],
  /**
   * Website 分类配置
   */
  WEBSITE_SORTS,
  /**
   * Website 配置（2023.3.29 已废弃）
   */
  WEBSITE_ITEMS,
  /**
   * 网站 Title Keywords Description 的配置，用于 SEO
   */
  TKD: {
    title: "Xiaochen's Blog Index",
    keywords: "Blog, Index, Index Page, Xiaochen, mcxiaochen, mcxioachenn, cdyxdxcClub",
    description: "This is XiaoChen's blog index page. 这是小尘的博客跳转页。",
  },
};

export default GLOBAL_CONFIG;