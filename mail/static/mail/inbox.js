document.addEventListener('DOMContentLoaded', function () {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => {
    re_ad, un_re_ad = false;
    load_mailbox('inbox');
  });
  document.querySelector('#sent').addEventListener('click', () => {
    re_ad, un_re_ad = false;
    load_mailbox('sent');
  });
  document.querySelector('#archived').addEventListener('click', () => {
    re_ad, un_re_ad = false;
    load_mailbox('archive');
  });
  document.querySelector('#compose').addEventListener('click', () => {
    re_ad, un_re_ad = false;
    compose_email();
  });

  // By default, load the inbox
  load_mailbox('inbox');
  ml_bx = 'inbox';  // global variable to determine the current mailbox name for various cases
  re_ad = false;
  un_re_ad = false;

  // View previous
  document.querySelector('#previous').onclick = () => {
    load_mailbox(ml_bx, parseInt(document.querySelector('#start').innerHTML) - 11, parseInt(document.querySelector('#last').innerHTML) - 10);
  };

  // View next
  document.querySelector('#next').onclick = () => {
    load_mailbox(ml_bx, parseInt(document.querySelector('#start').innerHTML) + 9, parseInt(document.querySelector('#last').innerHTML) + 10);
  };

  // Return to emails list button
  document.querySelector('#back').onclick = () => load_mailbox(ml_bx);

  // Refresh button
  document.querySelector('#refresh').onclick = () => {
    re_ad, un_re_ad = false;
    load_mailbox(ml_bx);
  };

  // Select Read emails only
  document.querySelector('#reads').onclick = () => {
    re_ad = true; // global variable to determine whether selected emails will be read or not
    un_re_ad = false;
    load_mailbox(ml_bx);
  };

  // Select Unread emails only
  document.querySelector('#unreads').onclick = () => {
    un_re_ad = true; // global variable to determine whether selected emails will be unread or not
    re_ad = false;
    load_mailbox(ml_bx);
  };

  // Mark all as Read button
  document.querySelector('#mark').onclick = () => {
    if (!confirm('Are you sure, you want to mark all as read?'))
      return;
    fetch(`emails/${ml_bx}`)
      .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, body: data })))
      .then(emails => {
        if(!handle_response(emails)) return;
        emails.body.forEach(email => do_read(email.id));
      })
      .catch(error => console.log(error));
    load_mailbox('inbox');
  };
  // Process the composed form on submit
  document.querySelector('#compose-form').onsubmit = () => {
    const com_recipients = document.querySelector('#compose-recipients').value;
    const com_subject = document.querySelector('#compose-subject').value;
    const com_body = document.querySelector('#compose-body').value;

    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: com_recipients,
        subject: com_subject,
        body: com_body
      })
    })
      .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, body: data })))
      .then(result => {
        if(!handle_response(result, true)) return;
        load_mailbox('sent');
      })
      .catch(error => console.log(error));    
    return false;
  };
});
// toggles to compose form view
function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';  

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}
// toggles to mailbox view
function load_mailbox(mailbox, start = 0, last = 10) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#hide').style.display = 'block';
  document.querySelector('#back').style.display = 'none';
  document.querySelector('#refresh').style.display = 'block';
  document.querySelector('#mark').style.display = 'none';
  if(mailbox === 'inbox') {
    ml_bx = 'inbox';
    document.querySelector('#mark').style.display = 'block';
  }
  else if(mailbox === 'sent') ml_bx = 'sent';
  else ml_bx = 'archive';

  // Show the mailbox name
  document.querySelector('#mailbox-name').innerHTML = `${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}`;

  fetch(`/emails/${mailbox}`)
    .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, body: data })))
    .then(emails => {
      if(!handle_response(emails)) return;
      document.querySelector('#list-email').innerHTML = '';
      let e = [];
      let r = emails.body.filter(x => x.read);
      let unr = emails.body.filter(x => !x.read);
      if(re_ad) e = r;
      else if(un_re_ad) e = unr;
      else e = emails.body;
      document.querySelector('#read').innerHTML = r.length;
      document.querySelector('#unread').innerHTML = emails.body.length - r.length;

      // for previous and next views
      if (e.length < last) last = e.length;
      else if (last % 10) last += 10 - last % 10;
      if (e.length === 0 || emails.body.length !== e.length)
        document.querySelector('#mark').disabled = true;
      else
        document.querySelector('#mark').disabled = false;
      if (e.length === 0) start = -1;
      document.querySelector('#start').innerHTML = start + 1;
      document.querySelector('#last').innerHTML = last;
      document.querySelector('#total').innerHTML = e.length;

      // Print emails
      print_emails(e.slice(start, last));

      if (start < 10)
        document.querySelector('#previous').style.pointerEvents = 'none';
      else
        document.querySelector('#previous').style.pointerEvents = 'auto';
      if (last == e.length)
        document.querySelector('#next').style.pointerEvents = 'none';
      else
        document.querySelector('#next').style.pointerEvents = 'auto';
    })
    .catch(error => console.log(error));
}
// toggles to an email view
function load_email(id) {

  // Show the email and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#hide').style.display = 'none';
  document.querySelector('#back').style.display = 'block';
  document.querySelector('#refresh').style.display = 'none';
  document.querySelector('#mark').style.display = 'none';

  fetch(`/emails/${id}`)
    .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, body: data })))
    .then(email => {
      if(!handle_response(email)) return;
      // Print the email
      print_email(email.body);
    })
    .catch(error => console.log(error));
  do_read(id);
}
// print out list of emails
function print_emails(emails) {
  let count = 0;
  emails.forEach(email => {

    // assign HTML elements to constants
    const div = document.createElement('div');
    const strong_name = document.createElement('strong');
    const span_subject = document.createElement('span');
    const small_timestamp = document.createElement('small');

    // insert sender name with a counter prepended
    strong_name.innerHTML = `${++count}. ${email.sender}`;
    strong_name.style.minWidth = '120px';
    strong_name.style.display = 'inline-block';
    div.append(strong_name);

    // insert subject
    span_subject.innerHTML = email.subject;
    div.append(span_subject);

    // insert timestamp
    small_timestamp.innerHTML = email.timestamp;
    small_timestamp.className = 'badge badge-default badge-pill';
    small_timestamp.style.color = 'grey';
    div.append(small_timestamp);

    div.className = 'list-group-item d-flex justify-content-between align-items-center';
    div.style.cursor = 'pointer';
    div.onmouseover = () => { div.style.boxShadow = '-1px -1px 3px 0px #aaa inset' };
    div.onmouseleave = () => { div.style.boxShadow = 'none' };

    //if read, set background color to lightgrey(by default its white)
    if (email.read) div.style.backgroundColor = 'lightgrey';
    div.onclick = () => load_email(email.id);
    document.querySelector('#list-email').append(div);
  });
}
// print out the email
function print_email(email) {

  const email_list = document.querySelector('#list-email');
  const from = document.createElement('p');
  const to = document.createElement('p');
  const subject = document.createElement('p');
  const timestamp = document.createElement('p');
  const body = document.createElement('p');
  const title = document.createElement('h2');
  const reply = document.createElement('button');
  const div = document.createElement('div');

  email_list.innerHTML = '';
  title.innerHTML = email.subject;
  email_list.append(title);
  from.innerHTML = `<strong>From: </strong>${email.sender}`;
  email_list.append(from);
  to.innerHTML = `<strong>To: </strong>${email.recipients}`;
  email_list.append(to);
  subject.innerHTML = `<strong>Subject: </strong>${email.subject}`;
  email_list.append(subject);
  timestamp.innerHTML = `<strong>Timestamp: </strong>${email.timestamp}`;
  email_list.append(timestamp);
  body.innerHTML = `${email.body}`;
  body.className = 'p-4 border';
  email_list.append(body);

  if (ml_bx !== 'sent') {
    let archives = document.createElement('button');
    if (email.archived)
      archives.innerHTML = 'Unarchive';
    else archives.innerHTML = 'Archive';
    archives.className = 'btn btn-outline-primary';
    archives.onclick = () => {
      do_archive(email);
      load_mailbox('inbox');
    };
    div.append(archives);
  }

  reply.innerHTML = 'Reply';
  reply.className = 'btn btn-outline-primary ml-1';
  reply.onclick = () => {
    compose_email();
    document.querySelector('#compose-recipients').value = email.sender;
    document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote: ${email.body}\n`;
    if (email.subject.startsWith('Re: '))
      document.querySelector('#compose-subject').value = email.subject;
    else document.querySelector('#compose-subject').value = `Re: ${email.subject}`;
  };
  div.append(reply);  
  email_list.append(div);    
}
// handles response for the respective fetch request
function handle_response(result, flag = false) {
  const msg = document.querySelector('#msg-box');
  msg.onclick = () => msg.style.display = 'none';
  if (result.ok && flag) {
    msg.style.display = 'block'
    msg.className = 'alert alert-success';
    msg.innerHTML = result.body.message;
  }
  else if(!result.ok) {
    msg.style.display = 'block'
    msg.className = 'alert alert-danger';
    msg.innerHTML = `<h4>${result.status}:<small> ${result.body.error}</small></h4>`;
    return false;
  }
  return true;
}
// marks an email as read
function do_read(id){
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
}
// archives/unarchives an email
function do_archive(email){
  let flag = true;
  if(email.archived) flag = false;
  fetch(`/emails/${email.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: flag
    })
  })
}