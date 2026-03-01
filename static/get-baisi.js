document.addEventListener("DOMContentLoaded", function () {

  const defaultImg = "/static/default.jpg"; // 兜底图

  fetch("https://v2.xxapi.cn/api/baisi", { cache: "no-store" })
    .then(res => res.json())
    .then(data => {
      const img = data?.data || defaultImg;
      setBg(img);
    })
    .catch(() => {
      setBg(defaultImg);
    });

  function setBg(url) {
    document.querySelectorAll(".photo-bg").forEach(el => {
      el.style.backgroundImage = `url(${url})`;
    });
  }

});