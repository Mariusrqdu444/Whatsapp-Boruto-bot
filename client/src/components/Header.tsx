import { WifiIcon, MoreVerticalIcon } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-surface shadow-md">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <WifiIcon className="text-primary mr-2" size={20} />
            <span className="text-gray-800 font-medium text-lg">Boruto VPN Offline Server WhatsApp</span>
          </div>
          <div>
            <MoreVerticalIcon className="text-gray-600" size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
