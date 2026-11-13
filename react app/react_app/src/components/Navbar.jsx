function Navbar() {
    return (
        <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', width: '103%' }}>
            <div className="contact_us" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginLeft: '-9%' }}>
                <ul>
                    <li id="a">
                        <i className="bx bxs-phone"></i>
                        <a href="contact.html">Contact us</a>
                    </li>
                </ul>
            </div>

            <div className="logo" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginLeft: '14%' }}>
                <a href="https://atharvgit2005.github.io/DIY-fashion-design/index.html">
                    <button
                        id="b"
                        style={{
                            fontSize: 'x-large',
                            fontFamily: 'gotham, helvetica',
                            fontWeight: '700',
                            marginLeft: '15px',
                        }}
                    >
                        <img
                            src="/media/GRWM black.png"
                            alt="Logo"
                            style={{ width: '150px', marginLeft: '-20px', marginTop: '-10px' }}
                        />
                    </button>
                </a>
            </div>

            <div className="menu" style={{ display: 'flex', justifyContent: 'center', width: '115%', marginRight: '10px' }}>
                <ul>
                    <li id="a">
                        <i className="bx bxs-home"></i>
                        <a id="home" href="#bar">Home</a>
                    </li>
                    <li id="a">
                        <i className="bx bx-expand-vertical"></i>
                        <a id="about" href="#aboutpage">About</a>
                    </li>
                    <li id="a">
                        <i className="bx bxs-log-in"></i>
                        <a id="log_in" href="login.html">Log In</a>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

export default Navbar;