// Loads one client's chat widget on this page so an admin can try it (?client=<id>)
(function () {
  var id = new URLSearchParams(location.search).get('client') || '';
  var text = document.getElementById('preview-text');
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id)) { text.textContent = 'No valid client ID in the link.'; return; }
  text.innerHTML = 'Testing the chatbot for <code></code>. Open the chat bubble in the corner.';
  text.querySelector('code').textContent = id;
  var s = document.createElement('script');
  s.src = '/widget.js';
  s.setAttribute('data-client-id', id);
  s.onload = function () {
    // Open the chat window straight away
    var tries = 0, t = setInterval(function () {
      var btn = document.getElementById('chatbot-launcher');
      if (btn || ++tries > 40) { clearInterval(t); if (btn) btn.click(); }
    }, 100);
  };
  document.body.appendChild(s);
})();
