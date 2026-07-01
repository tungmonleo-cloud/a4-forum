import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://dien-dan-lop-a4-24df0-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const postBox = document.getElementById("posts");
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const userAvatarImg = document.getElementById("userAvatar");
const btnGroupCall = document.getElementById("btnGroupCall");
const callStatusText = document.getElementById("callStatusText");
const storiesContainer = document.getElementById("storiesContainer");

let selectedImageURL = "";
let localStream = null;
let callTimeoutTimer = null;
let isCalling = false;

// Trạng thái quản lý bảng Tạo Story
let storyMediaData = "";
let storyMediaType = "";
let storyMusicName = ""; // Biến này có thể chứa tên bài hát hoặc link Spotify
let storyLiveStream = null;
let storyMediaRecorder = null;
let storyRecordedChunks = [];
let isRecording = false;
let storyPlayInterval = null;

// Hàm chuyển link Spotify thường thành link nhúng Embed Code
function getSpotifyEmbedUrl(url) {
    if (!url) return null;
    if (url.includes("spotify.com")) {
        // Biến đổi link từ dạng /track/abc sang dạng nhúng /embed/track/abc
        let embedUrl = url.replace("open.spotify.com/", "open.spotify.com/embed/");
        if (embedUrl.includes("?")) {
            embedUrl = embedUrl.split("?")[0];
        }
        return embedUrl;
    }
    return null;
}

// ==================== I. QUẢN LÝ BÀI VIẾT (POSTS) ====================
onValue(ref(db, "posts"), (snapshot) => {
    const data = snapshot.val();
    let postsArray = [];
    if (data) {
        postsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        postsArray.reverse();
    }
    renderPosts(postsArray);
});

function executePost() {
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    const currentAvatar = userAvatarImg ? userAvatarImg.src : "assets/avatar-default.png";

    if (text === "") {
        alert("Vui lòng viết nội dung trước khi đăng bài!");
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

    push(ref(db, "posts"), newPost);
    textInput.value = "";
    selectedImageURL = "";
    document.getElementById("imageInput").value = "";
    document.getElementById("cameraInput").value = "";
}

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
        if (item.image) {
            postImageHTML = `<img src="${item.image}" style="max-width:100%; max-height:350px; border-radius:8px; margin-top:12px; display:block; object-fit:cover;">`;
        }

        // Tách kiểm tra xem bài đăng có nhúng kèm link Spotify hay không
        let spotifyIframePostHTML = "";
        if (item.text && item.text.includes("https://open.spotify.com")) {
            // Tìm link spotify trong text bài đăng
            const words = item.text.split(/\s+/);
            const foundLink = words.find(w => w.includes("open.spotify.com"));
            const embedLink = getSpotifyEmbedUrl(foundLink);
            if (embedLink) {
                spotifyIframePostHTML = `
                <div style="margin-top:12px;">
                    <iframe src="${embedLink}" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                </div>`;
            }
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
                <h4 style="margin: 0; color: #38bdf8;">${item.name}</h4>
                <small style="color: #64748b;">${item.time}</small>
            </div>
        </div>
        <p style="color: #e2e8f0; line-height: 1.5; white-space: pre-line; margin:0;">${item.text}</p>
        ${spotifyIframePostHTML}
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
            const commentText = prompt("Nhập nội dung bình luận:");
            if (commentText && commentText.trim() !== "") {
                const currentUser = nameInput.value.trim() || "Ẩn danh";
                push(ref(db, `posts/${id}/comments`), { user: currentUser, content: commentText.trim() });
            }
        };
    });
    document.querySelectorAll(".btn-delete-trigger").forEach(btn => {
        btn.onclick = function() {
            const id = this.getAttribute("data-id");
            if (confirm("Xóa bài viết này?")) set(ref(db, `posts/${id}`), null);
        };
    });
}

// ==================== II. QUẢN LÝ TIN NHẬT KÝ 24H (STORIES) ====================
onValue(ref(db, "stories"), (snapshot) => {
    const data = snapshot.val();
    storiesContainer.innerHTML = "";
    if (data) {
        const now = Date.now();
        Object.keys(data).forEach(key => {
            const story = data[key];
            if (now - story.timestamp > 86400000) {
                set(ref(db, `stories/${key}`), null);
            } else {
                const div = document.createElement("div");
                div.className = "story-item";
                div.innerHTML = `
                    <div class="story-avatar-ring"><img src="${story.avatar}"></div>
                    <div class="story-name">${story.name}</div>
                `;
                div.onclick = () => viewSelectedStory(key, story);
                storiesContainer.appendChild(div);
            }
        });
    }
});

window.openStoryCreateModal = function() { document.getElementById("storyCreateModal").style.display = "flex"; };
window.closeStoryCreateModal = function() {
    stopStoryCameraHardware();
    document.getElementById("storyText").value = "";
    document.getElementById("storyMediaPreview").innerHTML = "";
    document.getElementById("storyMediaPreview").style.display = "none";
    document.getElementById("storyMusicStatus").innerText = "🎵 Chèn bài hát hoặc Link Spotify";
    storyMediaData = ""; storyMediaType = ""; storyMusicName = "";
    document.getElementById("storyCreateModal").style.display = "none";
};

window.triggerStoryImage = function() { stopStoryCameraHardware(); document.getElementById("storyFileImageInput").click(); };
window.triggerStoryVideo = function() { stopStoryCameraHardware(); document.getElementById("storyFileVideoInput").click(); };

window.handleStoryFileSelect = function(input, type) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 8 * 1024 * 1024) { alert("Vui lòng chọn file nhỏ hơn 8MB!"); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            storyMediaData = e.target.result; storyMediaType = type; showMediaPreviewInModal();
        };
        reader.readAsDataURL(file);
    }
};

function showMediaPreviewInModal() {
    const previewBox = document.getElementById("storyMediaPreview");
    previewBox.innerHTML = ""; previewBox.style.display = "flex";
    if (storyMediaType === "image") {
        previewBox.innerHTML = `<img src="${storyMediaData}" style="max-width:100%; max-height:130px; object-fit:contain;">`;
    } else if (storyMediaType === "video") {
        previewBox.innerHTML = `<video src="${storyMediaData}" muted autoplay loop style="max-width:100%; max-height:130px; object-fit:contain;"></video>`;
    }
}

window.actionStoryCapture = function() {
    const camContainer = document.getElementById("storyCamContainer");
    const videoLive = document.getElementById("storyVideoLive");
    const btnCamSnap = document.getElementById("btnCamSnap");

    if (camContainer.style.display === "none" || !storyLiveStream) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                storyLiveStream = stream; videoLive.srcObject = stream;
                camContainer.style.display = "block";
                document.getElementById("storyMediaPreview").style.display = "none";
                btnCamSnap.innerHTML = "📸 Bấm để Chụp";
            }).catch(() => alert("Không mở được camera!"));
    } else {
        const canvas = document.createElement("canvas");
        canvas.width = videoLive.videoWidth || 640; canvas.height = videoLive.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(videoLive, 0, 0, canvas.width, canvas.height);
        storyMediaData = canvas.toDataURL("image/jpeg"); storyMediaType = "image";
        stopStoryCameraHardware(); showMediaPreviewInModal();
        btnCamSnap.innerHTML = "📸 Chụp ảnh liền";
    }
};

window.actionStoryRecord = function() {
    const camContainer = document.getElementById("storyCamContainer");
    const videoLive = document.getElementById("storyVideoLive");
    const btnCamRec = document.getElementById("btnCamRec");
    const recDot = document.getElementById("storyCamRecDot");

    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                storyLiveStream = stream; videoLive.srcObject = stream;
                camContainer.style.display = "block";
                document.getElementById("storyMediaPreview").style.display = "none";
                recDot.style.display = "block";
                storyRecordedChunks = [];
                storyMediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
                storyMediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) storyRecordedChunks.push(e.data); };
                storyMediaRecorder.onstop = () => {
                    const blob = new Blob(storyRecordedChunks, { type: "video/webm" });
                    const reader = new FileReader();
                    reader.onload = (e) => { storyMediaData = e.target.result; storyMediaType = "video"; showMediaPreviewInModal(); };
                    reader.readAsDataURL(blob);
                };
                storyMediaRecorder.start(); isRecording = true;
                btnCamRec.innerHTML = "🛑 Dừng quay"; btnCamRec.style.background = "#ef4444";
            }).catch(() => alert("Không truy cập được thiết bị quay phim!"));
    } else {
        if (storyMediaRecorder && storyMediaRecorder.state !== "inactive") storyMediaRecorder.stop();
        stopStoryCameraHardware(); recDot.style.display = "none"; isRecording = false;
        btnCamRec.innerHTML = "📹 Quay video"; btnCamRec.style.background = "#334155";
    }
};

function stopStoryCameraHardware() {
    if (storyLiveStream) { storyLiveStream.getTracks().forEach(track => track.stop()); storyLiveStream = null; }
    document.getElementById("storyCamContainer").style.display = "none";
    document.getElementById("storyCamRecDot").style.display = "none";
}

window.addMusicToStory = function() {
    const inputSong = prompt("Dán Link bài hát từ Spotify HOẶC nhập tên bài hát tùy thích:");
    if (inputSong && inputSong.trim() !== "") { 
        storyMusicName = inputSong.trim(); 
        if(storyMusicName.includes("spotify.com")) {
            document.getElementById("storyMusicStatus").innerText = `✅ Đã nhận link Spotify`; 
        } else {
            document.getElementById("storyMusicStatus").innerText = `🎵 Nhạc: ${storyMusicName}`; 
        }
    }
};

window.submitNewStoryCloud = function() {
    const textContent = document.getElementById("storyText").value.trim();
    if (!textContent && !storyMediaData) { alert("Vui lòng điền nội dung tin!"); return; }
    const finalPayload = {
        name: nameInput.value.trim() || "Thành viên ẩn danh",
        avatar: userAvatarImg ? userAvatarImg.src : "assets/avatar-default.png",
        text: textContent,
        image: storyMediaType === "image" ? storyMediaData : "",
        video: storyMediaType === "video" ? storyMediaData : "",
        music: storyMusicName,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    push(ref(db, "stories"), finalPayload).then(() => { alert("Đã đăng nhật ký thành công!"); closeStoryCreateModal(); });
};

function viewSelectedStory(storyId, story) {
    const modal = document.getElementById("storyViewModal");
    const sImg = document.getElementById("storyViewImg");
    const sVid = document.getElementById("storyViewVid");
    const sText = document.getElementById("storyViewText");
    const musicWidget = document.getElementById("storyViewMusicWidget");
    const spotifyContainer = document.getElementById("storyViewSpotifyContainer");
    const progressBarFill = document.getElementById("storyProgress");
    const btnDeleteStory = document.getElementById("btnDeleteStory");

    document.getElementById("storyViewAvatar").src = story.avatar;
    document.getElementById("storyViewName").innerText = story.name;
    document.getElementById("storyViewTime").innerText = `Đăng lúc ${story.timeStr}`;
    sText.innerText = story.text;

    // KIỂM TRA QUYỀN XÓA TIN
    const currentMe = nameInput.value.trim() || "Thành viên ẩn danh";
    if (story.name === currentMe) {
        btnDeleteStory.style.display = "block";
        btnDeleteStory.onclick = function() {
            if (confirm("Bạn có chắc chắn muốn gỡ nhật ký này không?")) {
                clearInterval(storyPlayInterval);
                const sVidLive = document.getElementById("storyViewVid");
                sVidLive.pause(); sVidLive.src = "";
                
                set(ref(db, `stories/${storyId}`), null).then(() => {
                    alert("Đã gỡ bỏ nhật ký thành công!");
                    document.getElementById("storyViewModal").style.display = "none";
                });
            }
        };
    } else {
        btnDeleteStory.style.display = "none";
    }

    // XỬ LÝ PHẦN LIÊN KẾT SPOTIFY / TIÊU ĐỀ NHẠC
    spotifyContainer.innerHTML = "";
    spotifyContainer.style.display = "none";
    musicWidget.style.display = "none";

    if (story.music) {
        const embedUrl = getSpotifyEmbedUrl(story.music);
        if (embedUrl) {
            // Nếu là link Spotify, tạo một khung iframe nhúng luôn
            spotifyContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
            spotifyContainer.style.display = "block";
        } else {
            // Ngược lại hiển thị thanh chữ bình thường
            document.getElementById("storyViewMusicText").innerText = story.music; 
            musicWidget.style.display = "flex"; 
        }
    }

    if (story.video) { sVid.src = story.video; sVid.style.display = "block"; sImg.style.display = "none"; } 
    else if (story.image) { sImg.src = story.image; sImg.style.display = "block"; sVid.style.display = "none"; } 
    else { sImg.style.display = "none"; sVid.style.display = "none"; }

    modal.style.display = "flex";
    if (storyPlayInterval) clearInterval(storyPlayInterval);
    progressBarFill.style.width = "0%";
    let width = 0;

    if (story.video) {
        sVid.onloadedmetadata = function() {
            const stepTime = ((sVid.duration || 5) * 1000) / 50;
            storyPlayInterval = setInterval(() => { width += 2; progressBarFill.style.width = width + "%"; if (width >= 100) { clearInterval(storyPlayInterval); closeStoryModal(); } }, stepTime);
        };
    } else {
        storyPlayInterval = setInterval(() => { width += 2; progressBarFill.style.width = width + "%"; if (width >= 100) { clearInterval(storyPlayInterval); closeStoryModal(); } }, 100);
    }
}

window.closeStoryModal = function() {
    if (storyPlayInterval) clearInterval(storyPlayInterval);
    const sVid = document.getElementById("storyViewVid"); sVid.pause(); sVid.src = "";
    document.getElementById("storyViewModal").style.display = "none";
};

// ==================== III. QUẢN LÝ PHÒNG GỌI THOẠI (CALL ROOM) ====================
onValue(ref(db, "group_call"), (snapshot) => {
    const callData = snapshot.val();
    if (callData && callData.status === "active") {
        isCalling = true; btnGroupCall.innerHTML = "<span>🔴</span> Rời phòng thoại"; btnGroupCall.style.background = "#ef4444";
        const count = callData.participants ? Object.keys(callData.participants).length : 0;
        callStatusText.style.display = "block"; callStatusText.innerText = `👥 Trong phòng: ${count}/${callData.target_slots} thành viên`;
    } else {
        isCalling = false; btnGroupCall.innerHTML = "<span>🟢</span> Bắt đầu gọi nhóm"; btnGroupCall.style.background = "#22c55e"; callStatusText.style.display = "none";
        if (callTimeoutTimer) { clearTimeout(callTimeoutTimer); callTimeoutTimer = null; }
    }
});

if (btnGroupCall) {
    btnGroupCall.onclick = function() {
        if (!isCalling) { document.getElementById("callSlotsModal").style.display = "flex"; } 
        else {
            if (confirm("Bạn muốn rời cuộc gọi?")) {
                const currentUserName = nameInput.value.trim() || "Thành viên ẩn danh";
                onValue(ref(db, "group_call/participants"), (snap) => {
                    const parts = snap.val();
                    if (parts && Object.keys(parts).length <= 1) { set(ref(db, "group_call"), null); } 
                    else if (parts) {
                        Object.keys(parts).forEach(k => { if (parts[k] === currentUserName) set(ref(db, `group_call/participants/${k}`), null); });
                    }
                }, { onlyOnce: true });
            }
        }
    };
}

window.closeCallSlotsModal = function() { document.getElementById("callSlotsModal").style.display = "none"; };
window.confirmAndStartCall = function() {
    const slots = parseInt(document.getElementById("modalCallSlots").value);
    if (isNaN(slots) || slots < 2) { alert("Vui lòng nhập số người tối thiểu lớn hơn hoặc bằng 2!"); return; }
    closeCallSlotsModal();

    const currentUserName = nameInput.value.trim() || "Thành viên ẩn danh";
    set(ref(db, "group_call"), { status: "active", host: currentUserName, target_slots: slots, participants: {} }).then(() => {
        const myRef = push(ref(db, "group_call/participants")); set(myRef, currentUserName);
        alert(`Mở phòng thoại! Chờ gom đủ ${slots} người trong vòng 15 giây...`);
        callTimeoutTimer = setTimeout(() => {
            onValue(ref(db, "group_call"), (snap) => {
                const data = snap.val();
                if (data && (!data.participants || Object.keys(data.participants).length < data.target_slots)) {
                    set(ref(db, "group_call"), null); alert("⏳ Cuộc gọi tự hủy vì không đủ người tham gia!");
                } else if (data) { alert("🎉 Phòng thoại đủ người! Cuộc gọi bắt đầu."); }
            }, { onlyOnce: true });
        }, 15000);
    });
};

// ==================== IV. CÁC TIỆN ÍCH KHÁC (CAMERA BÀI VIẾT, EMOJI, LOGIN) ====================
window.saveGenderAndName = function() {
    const vaoTen = document.getElementById('modalName').value.trim();
    const chonGioiTinh = document.querySelector('input[name="popupGender"]:checked').value;
    const tenHienThi = vaoTen ? vaoTen : "Thành viên ẩn danh";
    
    nameInput.value = tenHienThi;
    document.getElementById('sidebarUser').innerText = tenHienThi;
    if (chonGioiTinh === "Nam") userAvatarImg.src = "https://i.pinimg.com/736x/7b/3c/11/7b3c11a1309faf9efb12dd3a0a662495.jpg"; 
    else if (chonGioiTinh === "Nữ") userAvatarImg.src = "https://i.pinimg.com/736x/4c/f6/37/4cf6377db53e0fb84e386b35e6950f27.jpg"; 
    else userAvatarImg.src = "assets/avatar-default.png";
    document.getElementById('genderModal').style.display = 'none';
};

window.triggerUpload = function() { document.getElementById("imageInput").click(); };
window.handleImageSelect = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { selectedImageURL = e.target.result; alert("📷 Đã đính kèm ảnh vào bài viết!"); };
        reader.readAsDataURL(input.files[0]);
    }
};

window.openCamera = function() {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { document.getElementById("cameraInput").click(); } 
    else {
        const cModal = document.getElementById("cameraModal"); cModal.style.display = "block";
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then(stream => { localStream = stream; document.getElementById("webcamVideo").srcObject = stream; })
            .catch(() => { alert("Không mở được camera!"); cModal.style.display = "none"; });
    }
};

window.captureSnapshot = function() {
    const video = document.getElementById("webcamVideo"); const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d"); ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    selectedImageURL = canvas.toDataURL("image/jpeg"); alert("📸 Đã chụp ảnh xong!"); stopWebcam();
};

window.stopWebcam = function() {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    document.getElementById("cameraModal").style.display = "none";
};

window.insertEmoji = function() {
    const emojis = ["🎉", "🔥", "❤️", "🤣", "👍", "👑", "✨", "🌸", "🎮"];
    let menu = "Chọn số tương ứng với Emoji muốn chèn:\n"; emojis.forEach((emo, i) => menu += `${i + 1}. ${emo}\n`);
    const choice = prompt(menu); const num = parseInt(choice);
    if (num >= 1 && num <= emojis.length) { textInput.value += " " + emojis[num - 1] + " "; textInput.focus(); }
};

window.insertLocation = function() { const loc = prompt("Nhập vị trí:"); if (loc) textInput.value += ` 📍 [Tại ${loc.trim()}]`; };

window.insertMusic = function() { 
    const song = prompt("Dán Link bài hát từ Spotify hoặc nhập chữ bất kỳ để chèn nhạc vào Bài viết chính:"); 
    if (song) textInput.value += ` ${song.trim()} `; 
};

document.addEventListener("DOMContentLoaded", () => {
    const postBtn = document.querySelector(".post-btn");
    if (postBtn) postBtn.onclick = executePost;
});