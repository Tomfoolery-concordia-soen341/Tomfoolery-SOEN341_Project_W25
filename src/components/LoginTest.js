import React, { useState } from 'react';
import 'bulma/css/bulma.min.css';
import './Style.css'; // Import your custom CSS for additional styling

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Remember Me:', rememberMe);
  };

  return (
    <section className="hero is-fullheight">
      <div className="hero-body">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-5-tablet is-4-desktop is-3-widescreen">
              <div className="box custom-box">
                <h1 className="title has-text-centered">Welcome back</h1>
                <p className="subtitle has-text-centered">Please enter your details</p>
                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label htmlFor="email" className="label">Email address</label>
                    <div className="control">
                      <input
                        type="email"
                        id="email"
                        placeholder="e.g. john.doe@example.com"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="password" className="label">Password</label>
                    <div className="control">
                      <input
                        type="password"
                        id="password"
                        placeholder="********"
                        className="input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      {' '}Remember for 30 days
                    </label>
                  </div>
                  <div className="field">
                    <button type="submit" className="button is-primary is-fullwidth">
                      Sign in
                    </button>
                  </div>
                  <div className="field">
                    <button type="button" className="button is-fullwidth">
                      <span className="icon">
                        <img src="https://www.google.com/favicon.ico" alt="Google" />
                      </span>
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;