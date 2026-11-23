var posts=["2025/04/20/tags-thirdparty/","2025/04/01/tags-media/","2025/03/18/tags-block/","2025/03/05/tags-inline/","2025/02/20/cover-variants/","2025/02/02/sticky-top/","2025/01/10/multi-taxonomy/","2025/01/01/zzz-probe/","2024/12/15/short-note/","2024/11/01/longform-hexo-astro/"];function toRandomPost(){
    pjax.loadUrl('/'+posts[Math.floor(Math.random() * posts.length)]);
  };