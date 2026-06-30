function post() {
    let title = document.getElementById("title").value;
    let content = document.getElementById("content").value;

    if (title === "" || content === "") {
        alert("Nhập đầy đủ tiêu đề và nội dung!");
        return;
    }

    let posts = JSON.parse(localStorage.getItem("posts")) || [];

    posts.push({
        title: title,
        content: content,
        likes: 0
    });

    localStorage.setItem("posts", JSON.stringify(posts));

    showPosts();

    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
}

function likePost(index) {
    let posts = JSON.parse(localStorage.getItem("posts")) || [];

    posts[index].likes += 1;

    localStorage.setItem("posts", JSON.stringify(posts));

    showPosts();
}

function showPosts() {
    let posts = JSON.parse(localStorage.getItem("posts")) || [];

    let container = document.getElementById("posts");
    container.innerHTML = "";

    for (let i = 0; i < posts.length; i++) {
        let div = document.createElement("div");
        div.className = "post";

        div.innerHTML = `
            <h3>${posts[i].title}</h3>
            <p>${posts[i].content}</p>
            <button onclick="likePost(${i})">👍 Like (${posts[i].likes})</button>
        `;

        container.appendChild(div);
    }
}

showPosts();