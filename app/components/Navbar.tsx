import { Link } from "react-router";
import Profile from "./Profile";

const Navbar = () => {
  return (
    <nav className="navbar">
        <Link to="/">
            <p className="text-2xl font-bold text-gradient">RESUMIND</p>
        </Link>
        <div className="flex items-center space-x-4 ml-auto">
            <Link to="/upload" className="primary-button w-fit">
                Upload Resume
            </Link>
            <Profile />
        </div>
    </nav>
  )
}

export default Navbar
