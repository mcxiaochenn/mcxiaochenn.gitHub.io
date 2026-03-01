// ==========================
// 异步加载系统
// ==========================

window.addEventListener("load", function () {

  // 延迟一点，避免抢占首屏
  setTimeout(() => {

    loadBodyBackground();
    loadCardBackground();
    loadMusic();

  }, 200);

});


// ==========================
// 1️⃣ 异步加载 body 背景
// ==========================
function loadBodyBackground() {

  const api = "https://www.loliapi.com/acg/";

  const img = new Image();
  img.src = api;

  img.onload = function () {
    document.body.style.backgroundImage = `url(${api})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  };
}


// ==========================
// 2️⃣ 异步加载卡片背景
// ==========================
function loadCardBackground() {

  fetch("https://v2.xxapi.cn/api/baisi")
    .then(res => res.json())
    .then(data => {

      if (!data?.data) return;

      const img = new Image();
      img.src = data.data;

      img.onload = function () {
        document.querySelectorAll(".photo-bg").forEach(el => {
          el.style.backgroundImage = `url(${data.data})`;
        });
      };

    })
    .catch(() => {
      console.log("卡片背景加载失败");
    });
}


// ==========================
// 3️⃣ 延迟加载音乐
// ==========================
function loadMusic() {

  // 动态创建 meting 标签
  const meting = document.createElement("meting-js");

  meting.setAttribute("server", music_server);
  meting.setAttribute("type", music_type);
  meting.setAttribute("id", music_id);
  meting.setAttribute("order", music_order);
  meting.setAttribute("volume", music_volume);
  meting.setAttribute("autoplay", music_autoplay);
  meting.setAttribute("loop", music_loop);

  if (music_fixed) {
    meting.setAttribute("fixed", "true");
  }

  if (music_mini) {
    meting.setAttribute("mini", "true");
  }

  document.getElementById("aplayer-inner").appendChild(meting);
}