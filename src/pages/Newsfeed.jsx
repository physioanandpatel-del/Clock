import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, Heart, Send, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getInitials } from '../utils/helpers';
import './Newsfeed.css';

export default function Newsfeed() {
  const { state, dispatch } = useApp();
  const { posts, employees } = state;

  const currentUserId = '1'; // Sarah Johnson (manager) for now
  const [newPost, setNewPost] = useState('');
  const [commentText, setCommentText] = useState({});

  const sortedPosts = useMemo(() => [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [posts]);

  function handlePost(e) {
    e.preventDefault();
    if (!newPost.trim()) return;
    dispatch({ type: 'ADD_POST', payload: { authorId: currentUserId, content: newPost.trim() } });
    setNewPost('');
  }

  function handleLike(postId) {
    dispatch({ type: 'TOGGLE_LIKE', payload: { postId, userId: currentUserId } });
  }

  function handleComment(e, postId) {
    e.preventDefault();
    const text = commentText[postId];
    if (!text?.trim()) return;
    dispatch({ type: 'ADD_COMMENT', payload: { postId, authorId: currentUserId, content: text.trim() } });
    setCommentText((prev) => ({ ...prev, [postId]: '' }));
  }

  function handleDelete(postId) {
    if (window.confirm('Delete this post?')) dispatch({ type: 'DELETE_POST', payload: postId });
  }

  function getUser(id) {
    return employees.find((e) => e.id === id) || { name: 'Unknown', color: '#94a3b8' };
  }

  return (
    <div className="newsfeed-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Newsfeed</h1>
          <p className="page-subtitle">Team announcements and updates</p>
        </div>
      </div>

      <form className="newsfeed-compose" onSubmit={handlePost}>
        <div className="newsfeed-compose__avatar" style={{ background: getUser(currentUserId).color }}>
          {getInitials(getUser(currentUserId).name)}
        </div>
        <div className="newsfeed-compose__input-wrap">
          <textarea className="newsfeed-compose__input" value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Share an update with your team..." rows={2} />
          <button type="submit" className="btn btn--primary btn--sm" disabled={!newPost.trim()}>
            <Send size={14} /> Post
          </button>
        </div>
      </form>

      <div className="newsfeed-posts">
        {sortedPosts.length === 0 ? (
          <div className="card"><div className="card__body"><div className="empty-state"><MessageSquare size={40} className="empty-state__icon" /><p>No posts yet. Share something with your team!</p></div></div></div>
        ) : (
          sortedPosts.map((post) => {
            const author = getUser(post.authorId);
            const isLiked = post.likes.includes(currentUserId);
            return (
              <div key={post.id} className="post-card">
                <div className="post-card__header">
                  <div className="post-card__author">
                    <div className="post-card__avatar" style={{ background: author.color }}>{getInitials(author.name)}</div>
                    <div>
                      <div className="post-card__name">{author.name}</div>
                      <div className="post-card__time">{formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true })}</div>
                    </div>
                  </div>
                  {post.authorId === currentUserId && (
                    <button className="btn btn--icon btn--sm" onClick={() => handleDelete(post.id)}><Trash2 size={14} /></button>
                  )}
                </div>
                <div className="post-card__body">{post.content}</div>
                <div className="post-card__actions">
                  <button className={`post-action ${isLiked ? 'post-action--liked' : ''}`} onClick={() => handleLike(post.id)}>
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} /> {post.likes.length > 0 ? post.likes.length : ''}
                  </button>
                  <span className="post-action post-action--count">
                    <MessageSquare size={16} /> {post.comments.length > 0 ? post.comments.length : ''}
                  </span>
                </div>
                {post.comments.length > 0 && (
                  <div className="post-card__comments">
                    {post.comments.map((c) => {
                      const cAuthor = getUser(c.authorId);
                      return (
                        <div key={c.id} className="comment">
                          <div className="comment__avatar" style={{ background: cAuthor.color }}>{getInitials(cAuthor.name)}</div>
                          <div className="comment__body">
                            <span className="comment__name">{cAuthor.name}</span>
                            <span className="comment__text">{c.content}</span>
                            <span className="comment__time">{formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <form className="post-card__comment-form" onSubmit={(e) => handleComment(e, post.id)}>
                  <input type="text" className="form-input" placeholder="Write a comment..." value={commentText[post.id] || ''} onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))} />
                  <button type="submit" className="btn btn--icon btn--sm"><Send size={14} /></button>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
