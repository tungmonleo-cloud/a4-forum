function post() {
  const name = document.getElementById("name").value.trim();
  const text = document.getElementById("text").value.trim();

  if (!name || !text) return;

  const posts = document.getElementById("posts");

  const div = document.createElement("div");
  div.className = "post";

  const time = new Date().toLocaleString();

  div.innerHTML = `
    <div class="name">👤 ${name}</div>
    <div>${text}</div>
    <div class="time">⏰ ${time}</div>

    <button class="btn-like" onclick="likePost(this)">
      ❤️ Thích (<span>0</span>)
    </button>

    <button class="btn-del" onclick="this.parentElement.remove()">
      🗑 Xoá
    </button>
  `;

  posts.prepend(div);

  document.getElementById("text").value = "";
}

function likePost(btn) {
  const span = btn.querySelector("span");
  let count = parseInt(span.textContent);
  count++;
  span.textContent = count;
}