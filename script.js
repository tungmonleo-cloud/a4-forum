const postBox = document.getElementById("posts");
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const userAvatarImg = document.getElementById("userAvatar");
const onlineList = document.getElementById("onlineList");
const onlineCardBox = document.getElementById("onlineCardBox");

let selectedImageURL = "";
let localStream = null;

// ĐÃ XÓA SẠCH: Mảng ban đầu để trống hoàn toàn, không có Minh, Lan, Huy, An nữa
let onlineUsers = [];

let posts = JSON.parse(localStorage.getItem("posts")) || [];

// Khởi chạy ứng dụng ban đầu
renderPosts();
renderOnlineUsers();

// Xử lý lưu thông tin đăng nhập ban đầu từ Popup
function saveGenderAndName() {
    const vaoTen = document.getElementById('modalName').value.trim();
    const chonGioiTinh = document.querySelector('input[name="popupGender"]:checked').value;
    const tenHienThi = vaoTen ? vaoTen : "Thành viên ẩn danh";
    
    nameInput.value = tenHienThi;
    document.getElementById('sidebarUser').innerText = tenHienThi;
    
    // Gán ảnh đại diện anime cá tính/dễ thương
    if (chonGioiTinh === "Nam") {
        userAvatarImg.src = "https://i.pinimg.com/736x/7b/3c/11/7b3c11a1309faf9efb12dd3a0a662495.jpg"; 
    } else if (chonGioiTinh === "Nữ") {
        userAvatarImg.src = "https://i.pinimg.com/736x/21/63/65/216365839ec8670dfefd7ec26aa4bb21.jpg"; // Link hình ảnh sketch anime bạn gửi
    } else {
        userAvatarImg.src = "assets/avatar-default.png"; 
    }

    // Chỉ thêm vào danh sách online người dùng vừa nhập tên vào hệ thống
    if (!onlineUsers.includes(tenHienThi)) {
        onlineUsers.push(tenHienThi);
    }
    
    renderOnlineUsers();
    document.getElementById('genderModal').style.display = 'none';
}

// Hàm cập nhật trạng thái hiển thị khu vực online
function renderOnlineUsers() {
    onlineList.innerHTML = "";

    // Nếu không có bất kỳ ai online, ẩn luôn widget này đi cho rỗng hoàn toàn đúng yêu cầu
    if (onlineUsers.length === 0) {
        onlineCardBox.style.display = "none";
        return;
    }

    // Nếu có người, bật hiển thị lên và áp màu chữ đen rõ ràng
    onlineCardBox.style.display = "block";
    onlineUsers.forEach(user => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.gap = "10px";
        li.style.margin = "8px 0";
        li.style.fontWeight = "600";
        li.style.color = "#000000"; // Chữ màu đen 100% cực kỳ dễ đọc

        li.innerHTML = `
            <span style="display:inline-block; width:20px; font-size:1.1rem; text-align:center;">👤</span>
            <span>${user}</span>
        `;
        onlineList.appendChild(li);
    });
}

function savePosts() {
    localStorage.setItem("posts", JSON.stringify(posts));
}

// =====================================
// KHU VỰC MULTIMEDIA (ALBUM & CAMERA)
// =====================================

function triggerUpload() {
    document.getElementById("imageInput").click();
}

function openCamera() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
        document.getElementById("cameraInput").click();
    } else {
        const cameraModal = document.getElementById("cameraModal");
        const video = document.getElementById("webcamVideo");
        cameraModal.style.display = "block";

        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then(stream => {
                localStream = stream;
                video.srcObject = stream;
            })
            .catch(err => {
                alert("Không thể khởi động camera! Hãy cấp quyền webcam cho trình duyệt.");
                cameraModal.style.display = "none";
            });
    }
}

function captureSnapshot() {
    const video = document.getElementById("webcamVideo");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    selectedImageURL = canvas.toDataURL("image/jpeg");
    alert("📸 Chụp ảnh thành công! Đã đưa vào hàng chờ bài viết.");
    stopWebcam();
}

function stopWebcam() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById("cameraModal").style.display = "none";
}

function handleImageSelect(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImageURL = e.target.result;
            alert("📷 Tải ảnh thành công!");
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// =====================================
// KHU VỰC CÔNG CỤ TIỆN ÍCH KHÁC
// =====================================

function insertEmoji() {
    const emojis = ["🎉", "🔥", "❤️", "🤣", "👍", "👑", "✨", "🌸", "🎮"];
    let menu = "Chọn số tương ứng với Emoji muốn chèn:\n";
    emojis.forEach((emo, i) => menu += `${i + 1}. ${emo}\n`);
    
    const choice = prompt(menu);
    const num = parseInt(choice);
    if (num >= 1 && num <= emojis.length) {
        textInput.value += " " + emojis[num - 1] + " ";
        textInput.focus();
    }
}

function insertLocation() {
    const loc = prompt("Nhập vị trí hoặc địa điểm hiện tại của bạn:");
    if (loc && loc.trim() !== "") {
        textInput.value += ` 📍 [Tại ${loc.trim()}]`;
    }
}

function insertMusic() {
    const song = prompt("Nhập tên bài hát bạn muốn chia sẻ:");
    if (song && song.trim() !== "") {
        textInput.value += ` 🎵 [Đang nghe: ${song.trim()}]`;
    }
}

// =====================================
// ĐĂNG BÀI VIẾT & TƯƠNG TÁC
// =====================================

function post() {
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    const currentAvatar = userAvatarImg ? userAvatarImg.src : "assets/avatar-default.png";

    if (name === "" || text === "") {
        alert("Vui lòng nhập đầy đủ tên và nội dung ý nghĩ!");
        return;
    }

    const data = {
        id: Date.now().toString(),
        name: name,
        avatar: currentAvatar,
        text: text,
        image: selectedImageURL,
        time: new Date().toLocaleString(),
        likes: 0,
        comments: []
    };

    posts.unshift(data);
    savePosts();
    renderPosts();
    
    textInput.value = "";
    selectedImageURL = ""; 
    document.getElementById("imageInput").value = ""; 
    document.getElementById("cameraInput").value = ""; 
}

function renderPosts() {
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
            postImageHTML = `<img src="${item.image}" alt="Post Image" style="max-width:100%; max-height:350px; border-radius:8px; margin-top:12px; display:block; object-fit:cover;">`;
        }

        let commentsHTML = "";
        if (item.comments && item.comments.length > 0) {
            commentsHTML = `<div style="margin-top:15px; padding-left:12px; border-left:2px solid #38bdf8; font-size:0.9rem; color:#94a3b8;">`;
            item.comments.forEach(cmt => {
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
            <button onclick="likePost('${item.id}')" style="cursor:pointer; padding:6px 12px; background:#334155; color:white; border:none; border-radius:6px;">❤️ ${item.likes}</button>
            <button onclick="commentPost('${item.id}')" style="cursor:pointer; padding:6px 12px; background:#334155; color:white; border:none; border-radius:6px;">💬 Bình luận</button>
            <button onclick="deletePost('${item.id}')" style="cursor:pointer; padding:6px 12px; background:#f43f5e; color:white; border:none; border-radius:6px;">🗑️ Xóa</button>
        </div>
        ${commentsHTML}
        `;
        postBox.appendChild(card);
    });
}

function likePost(id) {
    const post = posts.find(p => p.id === id.toString());
    if (!post) return;
    post.likes++;
    savePosts();
    renderPosts();
}

function commentPost(id) {
    const post = posts.find(p => p.id === id.toString());
    if (!post) return;

    const commentText = prompt("Nhập nội dung bình luận của bạn:");
    if (commentText && commentText.trim() !== "") {
        const currentUser = nameInput.value.trim() || "Ẩn danh";
        post.comments.push({
            user: currentUser,
            content: commentText.trim()
        });
        savePosts();
        renderPosts();
    }
}

function deletePost(id) {
    if (confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
        posts = posts.filter(p => p.id !== id.toString());
        savePosts();
        renderPosts();
    }
}