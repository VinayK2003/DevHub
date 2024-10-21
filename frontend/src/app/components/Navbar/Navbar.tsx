import React from "react";
import { MdPeopleAlt } from "react-icons/md";
import { FaPlus, FaPlay } from "react-icons/fa";
import { BsChatDots } from "react-icons/bs";
import { IoCodeSlashOutline } from "react-icons/io5";
import {LANGUAGE_VERSIONS} from '../Navbar/Languages';
import { FaGlobe } from "react-icons/fa";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


interface NavbarProps {
  meetingCode: string;
  setMeetingCode: (code: string) => void;
  setselectedLanguage:(lang:string)=>void;
  initiateMeeting: () => void;
  handleRunCode: () => void;
  setShowChat: (show: boolean) => void;
  showChat: boolean;
  selectedLanguage:string;
}
const Language=Object.entries(LANGUAGE_VERSIONS);

const Navbar: React.FC<NavbarProps> = ({
  meetingCode,
  setMeetingCode,
  initiateMeeting,
  handleRunCode,
  setShowChat,
  showChat,
  setselectedLanguage,
  selectedLanguage
}) => {
  return (
    <nav className="bg-[#1c1f2e] p-4 flex items-center justify-between">
      <div className="flex flex-row items-center justify-center">
        <h1 className="text-white text-lg font-semibold">
          DevHub <IoCodeSlashOutline className="inline-block mb-[1px] size-5" />
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-40 p-2 text-sm bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            placeholder="Meeting Code"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
          />
        </div>
        <button
          className="flex flex-row items-center gap-2 justify-center bg-white text-gray-900 py-1 px-3 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
          onClick={initiateMeeting}
        >
          Join <MdPeopleAlt size={17} />
        </button>
        <button
          className="flex flex-row items-center gap-2 justify-center bg-black text-white py-2 px-4 rounded-lg text-xs font-semibold hover:bg-gray-900 transition-colors"
          onClick={initiateMeeting}
        >
          Create <FaPlus size={12} />
        </button>
        <div>
        </div>
        <DropdownMenu >
        <DropdownMenuTrigger className="flex flex-row items-center gap-2 justify-center bg-white text-gray-900 py-1 px-3 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors" style={{ padding: '0.5rem 1rem' }} >
          {selectedLanguage || "Language"} {!selectedLanguage && <FaGlobe />}</DropdownMenuTrigger>
        <DropdownMenuContent >
        <DropdownMenuLabel >Languages</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Language.map(([lang,version])=>(
          <DropdownMenuItem key={lang} onClick={() => setselectedLanguage(lang)} >
            {lang} - {version}
            </DropdownMenuItem>
        ))}
        </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="text-white p-2 rounded-md hover:bg-gray-600 transition-colors"
          onClick={handleRunCode}
        >
          <FaPlay size={14} color="white" />
        </button>
        <button
          className="text-white p-2 rounded-md hover:bg-gray-600 transition-colors"
          onClick={() => setShowChat(!showChat)}
        >
          <BsChatDots size={20} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;