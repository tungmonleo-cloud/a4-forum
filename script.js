// KẾT NỐI HỆ THỐNG CƠ SỞ DỮ LIỆU ĐÁM MÂY FIREBASE TRỰC TUYẾN CỦA TÙNG
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Sử dụng Database URL của riêng bạn vừa thiết lập thành công
const firebaseConfig = {
    databaseURL: "https://dien-dan-lop-a4-24df0-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Khai báo các thành phần DOM giao diện
const postBox = document.getElementById("posts");
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const userAvatarImg = document.getElementById("userAvatar");
const onlineList = document.getElementById("onlineList");
const onlineCardBox = document.getElementById("onlineCardBox");

let selectedImageURL = "";
let localStream = null;
let onlineUsers = [];
let myOnlineRef = null; 

// 1. LẮNG NGHE BÀI VIẾT TỪ INTERNET TRÊN REALTIME DATABASE
onValue(ref(db, "posts"), (snapshot) => {
    const data = snapshot.val();
    let postsArray = [];
    if (data) {
        postsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        postsArray.reverse(); // Bài mới nhất xếp lên đầu
    }
    renderPosts(postsArray);
});

// 2. LẮNG NGHE THÀNH VIÊN ĐANG ONLINE TRÊN INTERNET
onValue(ref(db, "online"), (snapshot) => {
    const data = snapshot.val();
    onlineUsers = data ? Object.values(data) : [];
    renderOnlineUsers();
});

// Hàm xử lý lưu thông tin khi người dùng đăng nhập ban đầu vào diễn đàn
window.saveGenderAndName = function() {
    const vaoTen = document.getElementById('modalName').value.trim();
    const chonGioiTinh = document.querySelector('input[name="popupGender"]:checked').value;
    const tenHienThi = vaoTen ? vaoTen : "Thành viên ẩn danh";
    
    nameInput.value = tenHienThi;
    document.getElementById('sidebarUser').innerText = tenHienThi;
    
    // Đặt Avatar chuẩn theo giới tính lựa chọn
    if (chonGioiTinh === "Nam") {
        userAvatarImg.src = "https://i.pinimg.com/736x/7b/3c/11/7b3c11a1309faf9efb12dd3a0a662495.jpg"; 
    } else if (chonGioiTinh === "Nữ") {
        userAvatarImg.src = "https://i.pinimg.com/736x/4c/f6/37/4cf6377db53e0fb84e386b35e6950f27.jpg"; 
    } else {
        userAvatarImg.src = "assets/avatar-default.png"; 
    }

    // Đẩy trạng thái của bản thân lên danh sách online chung của cơ sở dữ liệu
    myOnlineRef = push(ref(db, "online"));
    set(myOnlineRef, tenHienThi);
    
    // Khi người dùng tắt tab trình duyệt, tự động xóa tên khỏi danh sách online trên mạng
    window.addEventListener("beforeunload", () => {
        if (myOnlineRef) remove(myOnlineRef);
    });

    document.getElementById('genderModal').style.display = 'none';
};

// Hiển thị danh sách online (Sạch tài khoản mồi, chữ rõ nét)
function renderOnlineUsers() {
    onlineList.innerHTML = "";

    if (onlineUsers.length === 0) {
        onlineCardBox.style.display = "none";
        return;
    }

    onlineCardBox.style.display = "block";
    onlineUsers.forEach(user => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.gap = "10px";
        li.style.margin = "10px 0";
        li.style.fontWeight = "600";
        li.style.color = "#0f172a"; 

        li.innerHTML = `
            <span style="display:inline-block; width:20px; font-size:1.1rem; text-align:center;">👤</span>
            <span>${user}</span>
        `;
        onlineList.appendChild(li);
    });
}

// SỬA LỖI ĐĂNG BÀI: Hàm đẩy bài viết mới lên mạng Firebase bằng Event Listener hiện đại
function executePost() {
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    const currentAvatar = userAvatarImg ? userAvatarImg.src : "assets/avatar-default.png";

    if (text === "") {
        alert("Vui lòng viết nội dung gì đó trước khi đăng bài!");
        return;
    }

    const newPost = {
        name: name,
        avatar: currentAvatar,
        text: text,
        image: selectedImageURL,
        time: new Date().toLocaleString(),
        likes: 0,
        comments: "" 
    };

    // Đẩy dữ liệu trực tiếp lên cloud database của bạn
    push(ref(db, "posts"), newPost);
    
    // Reset khung soạn thảo bài viết sạch sẽ
    textInput.value = "";
    selectedImageURL = ""; 
    document.getElementById("imageInput").value = ""; 
    document.getElementById("cameraInput").value = ""; 
}

// Đổ dữ liệu các bài viết nhận từ Internet ra màn hình công cộng
function renderPosts(posts) {
    postBox.innerHTML = "";

    posts.forEach(item => {
        const card = document.createElement("div");
        card.className = "post";
        card.style.background = "#1e293b";
        card.style.padding = "20px";
        card.style.borderRadius = "12px";
        card.style.marginBottom = "20px";
        card.style.border = "1px solid #334155";

        let postImageHTML = "";
        if (item.image && item.image !== "") {
            postImageHTML = `<img src="${item.image}" alt="Hình bài đăng" style="max-width:100%; max-height:350px; border-radius:8px; margin-top:12px; display:block; object-fit:cover;">`;
        }

        let commentsHTML = "";
        if (item.comments) {
            commentsHTML = `<div style="margin-top:15px; padding-left:12px; border-left:2px solid #38bdf8; font-size:0.9rem; color:#94a3b8;">`;
            Object.values(item.comments).forEach(cmt => {
                commentsHTML += `<p style="margin:4px 0;"><strong>💬 ${cmt.user}:</strong> ${cmt.content}</p>`;
            });
            commentsHTML += `</div>`;
        }

        card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <img src="${item.avatar}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
            <div>
                <h4 style="margin: 0; color: #38bdf8; font-size:1.05rem;">${item.name}</h4>
                <small style="color: #64748b;">${item.time}</small>
            </div>
        </div>
        
        <p style="color: #e2e8f0; line-height: 1.5; white-space: pre-line; margin:0;">${item.text}</p>
        ${postImageHTML}
        
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn-like-trigger" data-id="${item.id}" data-likes="${item.likes || 0}" style="cursor:pointer; padding:6px 12px; background:#334155; color:white; border:none; border-radius:6px;">❤️ ${item.likes || 0}</button>
            <button class="btn-comment-trigger" data-id="${item.id}" style="cursor:pointer; padding:6px 12px; background:#334155; color:white; border:none; border-radius:6px;">💬 Bình luận</button>
            <button class="btn-delete-trigger" data-id="${item.id}" style="cursor:pointer; padding:6px 12px; background:#f43f5e; color:white; border:none; border-radius:6px;">🗑️ Xóa</button>
        </div>
        ${commentsHTML}
        `;
        postBox.appendChild(card);
    });

    // Gán sự kiện tương tác trực tuyến động cho Thích, Bình luận, Xóa bài viết
    document.querySelectorAll(".btn-like-trigger").forEach(btn => {
        btn.onclick = function() {
            const id = this.getAttribute("data-id");
            const currentLikes = parseInt(this.getAttribute("data-likes"));
            set(ref(db, `posts/${id}/likes`), currentLikes + 1);
        };
    });

    document.querySelectorAll(".btn-comment-trigger").forEach(btn => {
        btn.onclick = function() {
            const id = this.getAttribute("data-id");
            const commentText = prompt("Nhập nội dung bình luận của bạn:");
            if (commentText && commentText.trim() !== "") {
                const currentUser = nameInput.value.trim() || "Ẩn danh";
                const newCommentRef = push(ref(db, `posts/${id}/comments`));
                set(newCommentRef, { user: currentUser, content: commentText.trim() });
            }
        };
    });

    document.querySelectorAll(".btn-delete-trigger").forEach(btn => {
        btn.onclick = function() {
            const id = this.getAttribute("data-id");
            if (confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
                set(ref(db, `posts/${id}`), null);
            }
        };
    });
}

// TỰ ĐỘNG GẮN SỰ KIỆN LẮNG NGHE NÚT ĐĂNG BÀI KHI KHỞI CHẠY
document.addEventListener("DOMContentLoaded", () => {
    const postBtn = document.querySelector(".post-btn");
    if (postBtn) {
        postBtn.onclick = executePost;
    }
});

// CÁC HÀM XỬ LÝ ĐÍNH KÈM ĐA PHƯƠNG TIỆN (ALBUM, CAMERA, TIỆN ÍCH)
window.triggerUpload = function() { document.getElementById("imageInput").click(); };
window.handleImageSelect = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { selectedImageURL = e.target.result; alert("📷 Đã đính kèm ảnh!"); };
        reader.readAsDataURL(input.files[0]);
    }
};
window.openCamera = function() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) { document.getElementById("cameraInput").click(); } 
    else {
        const cameraModal = document.getElementById("cameraModal");
        cameraModal.style.display = "block";
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then(stream => { localStream = stream; document.getElementById("webcamVideo").srcObject = stream; })
            .catch(() => { alert("Không mở được camera máy tính!"); cameraModal.style.display = "none"; });
    }
};
window.captureSnapshot = function() {
    const video = document.getElementById("webcamVideo");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    selectedImageURL = canvas.toDataURL("image/jpeg");
    alert("📸 Đã chụp ảnh xong!"); stopWebcam();
};
window.stopWebcam = function() {
    if (localStream) { localStream.getTracks().forEach(track => track.stop()); }
    document.getElementById("cameraModal").style.display = "none";
};
window.insertEmoji = function() {
    const emojis = ["🎉", "🔥", "❤️", "🤣", "👍", "👑", "✨", "🌸", "🎮"];
    let menu = "Chọn số tương ứng với Emoji muốn chèn:\n";
    emojis.forEach((emo, i) => menu += `${i + 1}. ${emo}\n`);
    const choice = prompt(menu); const num = parseInt(choice);
    if (num >= 1 && num <= emojis.length) { textInput.value += " " + emojis[num - 1] + " "; textInput.focus(); }
};
window.insertLocation = function() { const loc = prompt("Nhập vị trí hiện tại:"); if (loc && loc.trim() !== "") textInput.value += ` 📍 [Tại ${loc.trim()}]`; };
window.insertMusic = function() { const song = prompt("Nhập tên bài hát:"); if (song && song.trim() !== "") textInput.value += ` 🎵 [Đang nghe: ${song.trim()}]`; };