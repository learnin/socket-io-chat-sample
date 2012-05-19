// FIXME: XSS対策
var messagesArea;
var inputField;
var isEditing = false;

window.onload = function() {
    messagesArea = document.getElementById('messageArea');
    inputField = document.getElementById('message');

    document.onkeydown = function() {
        isEditing = true;
        edit();
    };
    document.onkeyup = function() {
        isEditing = false;
    };

    document.getElementById('commit').onclick = function() {
        var message = inputField.value;
        if (message.length > 0) {
            socket.json.emit('do commit', {
                "sessionid": mySessionid,
                "message": message
            });
            inputField.value = '';
        }
    };

    var prevMessage = '';

    function edit() {
        if (isEditing) {
            var message = inputField.value;
            if (prevMessage != message) {
                prevMessage = message;
                socket.json.emit('do input', {
                    "sessionid": mySessionid,
                    "message": message
                });
            }
            setTimeout(edit, 10);
        }
    }
};

var index = -1;

function createMessageHtml(sessionid, message, isCommited) {
    index++;
    var sessionidDiv = document.createElement('div');
    sessionidDiv.id = 'sessionid_' + index;
    sessionidDiv.style.display = "none";
    sessionidDiv.appendChild(document.createTextNode(sessionid));

    var userElement;
    if (sessionid != 'system') {
        userElement = document.createElement('span');
        userElement.id = 'user_' + index;
        userElement.appendChild(document.createTextNode(sessionid + 'さん> '));
    }
    var messageElement = document.createElement('span');
    messageElement.id = 'message_' + index;
    messageElement.appendChild(document.createTextNode(message));

    var isCommitedDiv = document.createElement('div');
    isCommitedDiv.id = 'isCommited_' + index;
    isCommitedDiv.style.display = 'none';
    isCommitedDiv.appendChild(document.createTextNode(isCommited));

    var messageContainerDiv = document.createElement('div');
    messageContainerDiv.id = 'messageContainer_' + index;
    messageContainerDiv.appendChild(sessionidDiv);
    if (userElement) {
        messageContainerDiv.appendChild(userElement);
    }
    messageContainerDiv.appendChild(messageElement);
    messageContainerDiv.appendChild(isCommitedDiv);
    messagesArea.insertBefore(messageContainerDiv, messagesArea.firstChild);
}

function getElementsByTagAndIdPrefix(doc, tag, prefix) {
    var result = [];
    var all = doc.getElementsByTagName(tag);
    if (all.length > 0) {
        result = Array.prototype.filter.call(all, function(element) {
            return element.id && element.id.lastIndexOf(prefix, 0) === 0;
        });
    }
    return result;
}

function findLastEditingMessageContainer(sessionid) {
    var result = null;
    var messageContainers = getElementsByTagAndIdPrefix(document, 'div', 'messageContainer_');
    if (messageContainers.length > 0) {
        for (var i = 0, n = messageContainers.length; i < n; i++) {
            var messageContainer = messageContainers[i];
            if (getElementsByTagAndIdPrefix(messageContainer, 'div', 'sessionid_')[0].innerHTML == sessionid && getElementsByTagAndIdPrefix(messageContainer, 'div', 'isCommited_')[0].innerHTML != 'true') {
                result = messageContainer;
            }
        }
    }
    return result;
}

var mySessionid;
var socket = io.connect();
socket.on('connect', function() {
    mySessionid = socket.socket.sessionid;
    socket.json.emit('do commit', {
        "sessionid": "system",
        "message": mySessionid + 'さんが入室しました。'
    });
    socket.on('done input', function(msg) {
        renderSendMessage(msg);
    });
    socket.on('done commit', function(msg) {
        console.log(msg);
        renderCommitMessage(msg);
    });
});

function renderSendMessage(msg) {
    var lastEditingMessageContainer = findLastEditingMessageContainer(msg.sessionid);
    if (lastEditingMessageContainer) {
        if (msg.message.length > 0) {
            getElementsByTagAndIdPrefix(lastEditingMessageContainer, 'span', 'message_')[0].innerHTML = msg.message;
        } else {
            messagesArea.removeChild(lastEditingMessageContainer);
        }
    } else {
        createMessageHtml(msg.sessionid, msg.message, false);
    }
}

function renderCommitMessage(msg) {
    var lastEditingMessageContainer = findLastEditingMessageContainer(msg.sessionid);
    if (lastEditingMessageContainer) {
        getElementsByTagAndIdPrefix(lastEditingMessageContainer, 'span', 'message_')[0].innerHTML = msg.message;
        getElementsByTagAndIdPrefix(lastEditingMessageContainer, 'div', 'isCommited_')[0].innerHTML = 'true';
    } else {
        createMessageHtml(msg.sessionid, msg.message, true);
    }
}
