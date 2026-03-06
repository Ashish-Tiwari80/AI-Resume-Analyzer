import { useEffect, useState } from "react";
import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";

interface User {
  username?: string;
  email?: string;
  avatar?: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const {auth} = usePuterStore();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await auth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="relative">
      
      {/* Profile Icon */}
      <img
        src={user?.avatar || "/images/user.png"}
        alt="profile"
        className="w-10 h-10 rounded-full cursor-pointer transition-transform duration-500 ease-in-out hover:scale-110"
        onClick={() => setOpen(!open)}
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-4">

          <div className="mb-3">
            <p className="font-semibold">{user?.username}</p>
          </div>

          <Link to="/wipe" className="block text-left text-xl font-semibold text-blue-400 hover:text-blue-600 mt-2">
            Wipe Data
          </Link>

          <button
            onClick={auth.signOut}
            className="w-full cursor-pointer text-left text-xl font-semibold text-red-400 hover:text-red-600 mt-4"
          >
            Logout ➜]
          </button>

        </div>
      )}

    </div>
  );
}

export default Profile
