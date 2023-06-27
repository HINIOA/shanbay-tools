const WORD_ENUMS = {
  "n.": "名词",
  "pron.": "代词",
  "adj.": "形容词",
  "v.": "动词",
  "vt.": "动词",
  "adv.": "副词",
  "conj.": "连词",
  "prep.": "介词",
  "auxv.": "助动词",
  "art.": "冠词",
  "article.": "冠词",
  "abbr.": "缩写",
  "num.": "量词",
  "defa.": "默认",
  "aux. v.": "助动词",
  "phrase.": "短语",
  "mod. v.": "情态动词",
  "linkv.": "连系动词",
  "int.": "未知", // come
  "infinmarker.": "不定词标记", // to
  ".": "未知", // Gatsby
  "un.": "未知", // workflow
};

function getWordViewOffset(wordView, x, y) {
  const rect = wordView.getBoundingClientRect();
  let top = y;
  let left = x;
  if (y + rect.height > window.innerHeight) {
    top = window.innerHeight - rect.height - 16;
  }
  if (x + rect.width > window.innerWidth) {
    left = window.innerWidth - rect.width - 16;
  }
  return {
    top: top + document.documentElement.scrollTop,
    left: left + document.documentElement.scrollLeft,
  };
}

function setElementPosition(element, position) {
  const { top, left } = getWordViewOffset(element, position.x, position.y);
  element.style.top = `${top}px`;
  element.style.left = `${left}px`;
}

function wordView(position, response) {
  if (!response) {
    return;
  }

  const { id: wordId, definitions, id_int: wordIdInt } = response;

  const wordModal = document.createElement("div");
  wordModal.classList.add("modal-s");

  const closeEle = document.createElement("div");
  closeEle.classList.add("close-modal");
  closeEle.innerHTML = "X";

  wordModal.appendChild(closeEle);

  if (response.msg) {
    const errMsg = document.createElement("div");
    errMsg.classList.add("error");

    if (response.msg === "登录信息过期") {
      errMsg.innerHTML =
        '<a href="https://web.shanbay.com/web/account/login" target="_blank">去扇贝网登录</a>';
    }

    if (response.msg === "单词没找到") {
      wordModal.style.alignItems = "center";
      const image = new Image(200, 150);
      image.src = chrome.extension.getURL("images/404.png");
      wordModal.appendChild(image);
      errMsg.innerHTML = "没有在扇贝网中查到该词";
    }

    wordModal.appendChild(errMsg);
    document.body.appendChild(wordModal);
    setElementPosition(wordModal, position);
  } else {
    const wordContent = document.createElement("div");
    wordContent.classList.add("word");
    wordContent.innerHTML = response.content;
    wordModal.appendChild(wordContent);
    const phoneticWrap = document.createElement("div");
    const phoneticSymbol = document.createElement("span");
    phoneticSymbol.classList.add("phonetic");
    phoneticSymbol.innerHTML =
      response.audios[0].us.ipa && `/${response.audios[0].us.ipa}/`;
    wordModal.appendChild(phoneticSymbol);

    const speaker = document.createElement("span");
    speaker.classList.add("speaker");
    speaker.innerHTML = "🔉";

    phoneticWrap.appendChild(phoneticSymbol);
    phoneticWrap.appendChild(speaker);

    wordModal.appendChild(phoneticWrap);

    const cnUl = document.createElement("div");
    cnUl.classList.add("ul");
    wordModal.appendChild(cnUl);
    for (let i = 0; i < definitions.cn.length; i++) {
      const li = document.createElement("div");
      li.classList.add("li");
      cnUl.appendChild(li);
      li.innerHTML = `【<b>${WORD_ENUMS[definitions.cn[i].pos]}</b>】 ${
        definitions.cn[i].def
      }`;
    }
    const enUl = document.createElement("div");
    wordModal.appendChild(enUl);
    enUl.classList.add("ul");
    for (let i = 0; i < definitions.en.length; i++) {
      const li = document.createElement("div");
      li.classList.add("li");
      enUl.appendChild(li);
      li.innerHTML = `<em><b>${definitions.en[i].pos}</b></em> ${definitions.en[i].def}`;
    }
    const button = document.createElement("div");
    button.classList.add("collect");
    button.innerHTML = "+添加到扇贝生词本";
    wordModal.appendChild(button);

    document.body.appendChild(wordModal);

    setElementPosition(wordModal, position);

    document.querySelector(".speaker").addEventListener("click", (event) => {
      var audio = document.createElement("audio");
      audio.src = response.audios[0].us.urls[0];
      audio.play();
      event.stopPropagation();
    });

    document.querySelector(".modal-s").addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document
      .querySelector(".close-modal")
      .addEventListener("click", (event) => {
        close();
      });

    document.querySelector(".collect").addEventListener("click", (event) => {
      if (typeof chrome.app.isInstalled !== "undefined") {
        chrome.runtime.sendMessage({ wordId, wordIdInt }, function (response) {
          button.remove();
          const a = document.createElement("a");
          a.innerHTML = "已加入扇贝生词本，去扇贝网学习";
          a.href = `https://web.shanbay.com/wordsweb/#/detail/${response.vocab_id}`;
          a.setAttribute("target", "_blank");
          wordModal.appendChild(a);
        });
      }
    });
  }
}

// ===== 划动选中事件 =====

function openButton(position, word) {
  // 关闭已有弹窗
  close()

  const $button = document.createElement("button");

  $button.innerText = "扇贝翻译";
  $button.classList.add("transform-btn");
  $button.style.top = `${position.y}px`
  $button.style.left = `${position.x}px`

  $button.addEventListener("click", (e) => {
    chrome.runtime.sendMessage({ word }, function (response) {
      wordView(position, response);
    });
  });

  document.body.appendChild($button);

  // 点击外侧关闭弹框
  setTimeout(() => {
    document.addEventListener('click', close);
  }, 500);
}

function handleSelect() {
  const selection = window.getSelection();

  if (selection.rangeCount < 1) {
    return
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const word = selection.toString();

  word && openButton({ x: rect.left, y: rect.bottom }, word);
}

function debounce(fn, delay) {
  let timer = null;

  return function () {
    const ctx = this;
    const args = arguments;

    clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(ctx, args);
    }, delay);
  };
}

document.addEventListener("selectionchange", debounce(handleSelect, 200));


// 移除弹框
function close() {
  const modal = document.querySelector(".modal-s");
  modal && modal.remove();
  const $button = document.querySelector(".transform-btn");
  $button && $button.remove();
  document.documentElement.removeEventListener('click', close)
}
