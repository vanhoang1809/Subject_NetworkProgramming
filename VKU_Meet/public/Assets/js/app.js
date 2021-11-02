//Add Offer Process
var AppProcess = (function () {
  var peers_connection_ids = [];
  // Hàm API gửi và nhận dữ liệu hình và giọng
  var peers_connection = [];
  var remote_vid_stream = [];
  var remote_aud_stream = [];
  var rtp_aud_senders = [];
  var rtp_vid_senders = [];
  var video_states = {
    None: 0,
    Camera: 1,
    ScreenShare: 2,
  };

  var video_st = video_states.None;
  var videoCamTrack;
  var serverProcess;
  var local_div;
  var audio;
  var isAudioMute = true;
  //Function init khoi tao uid va meeting id
  async function _init(SDP_function, my_connid) {
    serverProcess = SDP_function;
    my_connection_id = my_connid;
    eventProcess();
    local_div = document.getElementById("localVideoPlayer");
  }
  // Đặt sự kiện cho các nút
  async function eventProcess() {
    //Đặt sự kiện cho nút Audio
    $("#miceMuteUnmute").on("click", async function () {
      if (!audio) {
        await loadAudio();
      }
      if (!audio) {
        alert("audio permission has not granted");
        return;
      }
      if (isAudioMute) {
        audio.enabled = true;
        $(this).html(
          "<span class='material-icons'style='width:100%;'>mic</span>"
        );
        updateMediaSenders(audio, rtp_aud_senders);
      } else {
        audio.enabled = false;
        $(this).html(
          "<span class='material-icons'style='width:100%;'>mic_off</span>"
        );
        removeMediaSenders(rtp_aud_senders);
      }
      isAudioMute = !isAudioMute;
    });
    //Đặt sự kiện cho camera
    $("#videoCamOnOff").on("click", async function () {
      if (video_st == video_states.Camera) {
        await videoProcess(video_states.None);
      } else {
        await videoProcess(video_states.Camera);
      }
    });
    //Đặt sự kiện cho Present now
    $("#btnScreenShareOnOf").on("click", async function () {
      if (video_st == video_states.ScreenShare) {
        await videoProcess(video_states.None);
      } else {
        await videoProcess(video_states.ScreenShare);
      }
    });
  }
  // Xử lý sự kiện load Audio
  async function loadAudio() {
    try {
      var astream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      audio = astream.getAudioTracks()[0];
      audio.enabled = false;
    } catch (e) {
      console.log(e);
    }
  }
  // Xử lý sự kiện connect status
  function connection_status(connection) {
    if (
      connection &&
      (connection.connectionState == "new" ||
        connection.connectionState == "connecting" ||
        connection.connectionState == "connected")
    ) {
      return true;
    } else {
      return false;
    }
  }
  async function updateMediaSenders(track, rtp_senders) {
    for (var con_id in peers_connection_ids) {
      if (connection_status(peers_connection[con_id])) {
        if (rtp_senders[con_id] && rtp_senders[con_id].track) {
          rtp_senders[con_id].replaceTrack(track);
        } else {
          rtp_senders[con_id] = peers_connection[con_id].addTrack(track);
        }
      }
    }
  }
  //Loai bo media gui ra khoi con_id other
  function removeMediaSenders(rtp_senders) {
    for (var con_id in peers_connection_ids) {
      if (rtp_senders[con_id] && connection_status(peers_connection[con_id])) {
        peers_connection[con_id].removeTrack(rtpSenders[con_id]);
        rtp_senders[con_id] = null;
      }
    }
  }
  // Loai bo media hien tai ra khoi Stream cua user
  function removeVideoStream(rtp_vid_senders) {
    if (videoCamTrack) {
      videoCamTrack.stop();
      videoCamTrack = null;
      local_div.srcObject = null;
      removeMediaSenders(rtp_vid_senders);
    }
  }
  //Xử lý sự kiện video camera sử dụng API getUserMedia cho pép truy cập camera và mic nguời dùng
  async function videoProcess(newVideoState) {
    if (newVideoState == video_states.None) {
      $("#videoCamOnOff").html(
        " <span class='material-icons'style='width:100%;'> videocam_off </span>"
      );
      $("#btnScreenShareOnOf").html(
        "<span class='material-icons'> present_to_all </span><div>Present Now</div>"
      );
      video_st = newVideoState;
      removeVideoStream(rtp_vid_senders);
      return;
    }
    if (newVideoState == video_states.Camera) {
      $("#videoCamOnOff").html(
        " <span class='material-icons'style='width:100%;'> videocam_on </span>"
      );
    }
    try {
      var vstream = null;
      if (newVideoState == video_states.Camera) {
        vstream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
      } else if (newVideoState == video_states.ScreenShare) {
        vstream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
        vstream.onicecandidate = (e) => {
          removeVideoStream(rtp_vid_senders);
          $("#btnScreenShareOnOf").html(
            "<span class='material-icons '> present_to_all </span><div >Present Now</div>"
          );
        };
      }
      if (vstream && vstream.getVideoTracks().length > 0) {
        videoCamTrack = vstream.getVideoTracks()[0];
        if (videoCamTrack) {
          local_div.srcObject = new MediaStream([videoCamTrack]);
          updateMediaSenders(videoCamTrack, rtp_vid_senders);
        }
      }
    } catch (e) {
      console.log(e);
      return;
    }
    video_st = newVideoState;
    if (newVideoState == video_states.Camera) {
      $("#videoCamOnOff").html(
        '<span class="material-icons" style="width: 100%">videocam</span>'
      );
      $("#btnScreenShareOnOf").html(
        "<span class='material-icons '> present_to_all </span><div >Present Now</div>"
      );
    } else if (newVideoState == video_states.ScreenShare) {
      $("#videoCamOnOff").html(
        '<span class="material-icons" style="width: 100%">videocam_off</span>'
      );
      $("#btnScreenShareOnOf").html(
        "<span class='material-icons text-success'> present_to_all </span><div class='text-success'>Stop Present Now</div>"
      );
    }
  }
  // Khai báo máy chủ STUN của google
  /////////////////////////////
  var iceConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };
  //Function setNewConnection
  //Tao moi connect gửi các yêu cầu khởi chạy audio và video toi server cho user
  async function setConnection(connid) {
    var connection = new RTCPeerConnection(iceConfiguration);
    connection.onnegotiationneeded = async function (event) {
      await setOffer(connid);
    };

    connection.onicecandidate = function (event) {
      if (event.candidate) {
        serverProcess(
          JSON.stringify({ icecandidate: event.candidate }),
          connid
        );
      }
    };
    //Playing picture in picture
    //Khoi chay video va audio su dung phuong thuc MediaStream
    connection.ontrack = function (event) {
      if (!remote_vid_stream[connid]) {
        remote_vid_stream[connid] = new MediaStream();
      }
      if (!remote_aud_stream[connid]) {
        remote_aud_stream[connid] = new MediaStream();
      }
      if (event.track.kind == "video") {
        remote_vid_stream[connid]
          .getVideoTracks()
          .forEach((t) => remote_vid_stream[connid].removeTrack(t));
        remote_vid_stream[connid].addTrack(event.track);

        var remoteVideoPlayer = document.getElementById("v_" + connid);
        remoteVideoPlayer.srcObject = null;
        remoteVideoPlayer.srcObject = remote_vid_stream[connid];
        remoteVideoPlayer.load();
      } else if (event.track.kind == "audio") {
        //
        remote_aud_stream[connid]
          .getAudioTracks()
          .forEach((t) => remote_aud_stream[connid].removeTrack(t));
        remote_aud_stream[connid].addTrack(event.track);

        var remoteAudioPlayer = document.getElementById("a_" + connid);
        remoteAudioPlayer.srcObject = null;
        remoteAudioPlayer.srcObject = remote_aud_stream[connid];
        remoteAudioPlayer.load();
      }
    };
    peers_connection_ids[connid] = connid;
    peers_connection[connid] = connection;
    if (
      video_st == video_states.Camera ||
      video_st == video_states.ScreenShare
    ) {
      if (videoCamTrack) {
        updateMediaSenders(videoCamTrack, rtp_vid_senders);
      }
    }
    return connection;
  }
  ///Set offer serverProcess
  //Gui de nghi cho server
  async function setOffer(connid) {
    var connection = peers_connection[connid];
    var offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    serverProcess(
      JSON.stringify({
        offer: connection.localDescription,
      }),
      connid
    );
  }
  //Function SDPProcess Send answer message From Server to App(Client)
  //Lay du lieu tu server ve client
  async function SDPProcess(message, from_connid) {
    message = JSON.parse(message);
    if (message.answer) {
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    } else if (message.offer) {
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      await peers_connection[from_connid].setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      var answer = await peers_connection[from_connid].createAnswer();
      await peers_connection[from_connid].setLocalDescription(answer);
      serverProcess(
        JSON.stringify({
          answer: answer,
        }),
        from_connid
      );
    } else if (message.icecandidate) {
      if (!peers_connection[from_connid]) {
        await setConnection(from_connid);
      }
      // Bat loi
      try {
        await peers_connection[from_connid].addIceCandidate(
          message.icecandidate
        );
      } catch (e) {
        console.log(e);
      }
    }
  }
  //Tra ve ket noi moi cho connid,uid_meetingid,
  // lay du lieu hien thi len video va audio thong qua ham SDPProcess va setNewConnection
  return {
    setNewConnection: async function (connid) {
      await setConnection(connid);
    },
    init: async function (SDP_function, my_connid) {
      await _init(SDP_function, my_connid);
    },
    processClientFunc: async function (data, from_connid) {
      await SDPProcess(data, from_connid);
    },
  };
})();
///Add user and set connection
var MyApp = (function () {
  var socket = null;
  var user_id = "";
  var meeting_id = "";
  function init(uid, mid) {
    user_id = uid;
    meeting_id = mid;
    // Hiển thị ra màn hình với meetingContainer và userid-document
    $("#meetingContainer").show();
    $("#me h2").text(user_id + "(Me)");
    document.title = user_id;
    event_process_for_signal_server();
  }

  function event_process_for_signal_server() {
    socket = io.connect();
    //Send to server mess and to_connid
    var SDP_function = function (data, to_connid) {
      socket.emit("SDPProcess", {
        message: data,
        to_connid: to_connid,
      });
    };
    // Gửi user_id và meeting_id cho server
    socket.on("connect", () => {
      if (socket.connected) {
        AppProcess.init(SDP_function, socket.id);
        if (user_id != "" && meeting_id != "") {
          socket.emit("userconnect", {
            displayName: user_id,
            meetingid: meeting_id,
          });
        }
      }
    });
    socket.on("inform_others_about_me", function (data) {
      addUser(data.other_user_id, data.connId);
      AppProcess.setNewConnection(data.connId);
    });
    socket.on("inform_me_about_other_user", function (other_users) {
      if (other_users) {
        for (var i = 0; i < other_users.length; i++) {
          addUser(other_users[i].user_id, other_users[i].connectionId);
          AppProcess.setNewConnection(other_users[i].connectionId);
        }
      }
    });
    // From connid Server: Gửi tất cả message về server
    socket.on("SDPProcess", async function (data) {
      await AppProcess.processClientFunc(data.message, data.from_connid);
    });
  }
  // Lấy orther user về từ server
  ///////////////////////////////OtherTemplate
  function addUser(other_user_id, connId) {
    var newDivId = $("#otherTemplate").clone();
    newDivId = newDivId.attr("id", connId).addClass("other");
    newDivId.find("h2").text(other_user_id);
    newDivId.find("video").attr("id", "v_" + connId);
    newDivId.find("audio").attr("id", "a_" + connId);
    newDivId.show(); ///display otherTemplate show
    $("#divUsers").append(newDivId);
  }
  return {
    // UserID and MeetingID
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
