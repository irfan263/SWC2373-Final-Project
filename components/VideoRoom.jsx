import React, { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from './VideoPlayer';

const APP_ID = '7a20ef91198343938f9880c045ce214d';
const TOKEN =
  '007eJxTYJDYV+m97VJXp9C5y/7Fm2wkHF/Z886zWbiO8/S8Gt/lfJ8UGMwTjQxS0ywNDS0tjE2MLY0t0iwtLAySDUxMk1ONDE1SXtmEpTYEMjJ0Nc1kZmRgZGABYhCfCUwyg0kWMMnKkFmUlpjHwAAAXAohSA==';
const CHANNEL = 'irfan';

const client = AgoraRTC.createClient({
  mode: 'rtc',
  codec: 'vp8',
});

export const VideoRoom = () => {
  const [users, setUsers] = useState([]);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const handleUserJoined = async (user, mediaType) => {
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
      setUsers((previousUsers) => [...previousUsers, user]);
    }

    if (mediaType === 'audio') {
      user.audioTrack.play();
    }
  };

  const handleUserLeft = (user) => {
    setUsers((previousUsers) =>
      previousUsers.filter((u) => u.uid !== user.uid)
    );
  };

  const handleSendMessage = () => {
    const newMessages = [...messages, { uid: 'local', text: newMessage }];
    setMessages(newMessages);
    setNewMessage('');
  };

  useEffect(() => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    client
      .join(APP_ID, CHANNEL, TOKEN, null)
      .then((uid) =>
        Promise.all([
          AgoraRTC.createMicrophoneAndCameraTracks(),
          uid,
        ])
      )
      .then(([tracks, uid]) => {
        const [audioTrack, videoTrack] = tracks;
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        setUsers((previousUsers) => [
          ...previousUsers,
          {
            uid,
            videoTrack,
            audioTrack,
          },
        ]);
        client.publish(tracks);
      });

    return () => {
      for (let localTrack of [localAudioTrack, localVideoTrack]) {
        if (localTrack) {
          localTrack.stop();
          localTrack.close();
        }
      }
      client.off('user-published', handleUserJoined);
      client.off('user-left', handleUserLeft);
      client.unpublish([localAudioTrack, localVideoTrack]).then(() => client.leave());
    };
  }, [localAudioTrack, localVideoTrack]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 200px)' }}>
        {users.map((user) => (
          <VideoPlayer key={user.uid} user={user} />
        ))}
      </div>
      <div>
        <div style={{ overflowY: 'scroll', height: '300px', border: '1px solid #ccc' }}>
          {messages.map((message, index) => (
            <div key={index}>{`${message.uid}: ${message.text}`}</div>
          ))}
        </div>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};
