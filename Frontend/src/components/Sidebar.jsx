import React from 'react';
import { Link } from 'react-router-dom';

const SideBar = () => {
  return (
    <div className="fixed h-full w-56 bg-[#1C1C1C] text-[#CCCCCC] p-4 border-r-2 border-white">
      <div className="flex items-center mb-4">
        <div className="avatar placeholder">
          <div className="bg-gray-700 text-gray-400 rounded-full w-8">
            <span className="text-xs">UI</span>
          </div>
        </div>
        <span className="ml-2 text-[#CCCCCC]">Username</span>
      </div>
      <ul className="menu p-2 w-full">
        <li>
          <details open>
            <summary className="cursor-pointer text-[#CCCCCC] hover:text-[#A8C5DA]">User Profile</summary>
            <ul className="ml-2 mt-2">
              <li>
                <Link to="/overview" className="text-[#CCCCCC] hover:text-[#A8C5DA]">Overview</Link>
              </li>
              <li>
                <Link to="/reports" className="text-[#CCCCCC] hover:text-[#A8C5DA]">Reports</Link>
              </li>
              <li>
                <Link to="/Chatbot" className="text-[#CCCCCC] hover:text-[#A8C5DA]">Chatbot</Link>
              </li>
            </ul>
          </details>
        </li>
      </ul>
    </div>
  );
};

export default SideBar;
