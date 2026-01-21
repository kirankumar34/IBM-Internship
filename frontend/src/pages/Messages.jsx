import { useState } from 'react';
import { Search, Star } from 'lucide-react';

const Messages = () => {
    const contacts = [
        { id: 1, name: 'Project Admin', message: 'Can you review the latest PR?', time: '2m', unread: 2 },
        { id: 2, name: 'Team Member', message: 'I finished the task.', time: '1h', unread: 0 },
        { id: 3, name: 'Client User', message: 'When is the next meeting?', time: '1d', unread: 0 },
    ];

    const [active, setActive] = useState(1);

    return (
        <div className="h-[calc(100vh-8rem)] flex bg-dark-700 rounded-2xl border border-dark-600 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-80 border-r border-dark-600 flex flex-col">
                <div className="p-4 border-b border-dark-600">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="w-full bg-dark-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-primary placeholder-dark-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => setActive(c.id)}
                            className={`p-4 flex items-start space-x-3 cursor-pointer hover:bg-dark-600 transition ${active === c.id ? 'bg-dark-600' : ''}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-dark-500 flex items-center justify-center text-white font-bold text-sm">
                                {c.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="text-white font-medium text-sm truncate">{c.name}</h4>
                                    <span className="text-xs text-dark-500">{c.time}</span>
                                </div>
                                <p className="text-dark-400 text-xs truncate">{c.message}</p>
                            </div>
                            {c.unread > 0 && (
                                <div className="min-w-[1.25rem] h-5 rounded-full bg-primary text-dark-900 text-xs font-bold flex items-center justify-center">
                                    {c.unread}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="h-16 border-b border-dark-600 flex items-center justify-between px-6">
                    <h3 className="text-white font-bold">{contacts.find(c => c.id === active)?.name}</h3>
                    <button className="text-dark-500 hover:text-yellow-400"><Star size={20} /></button>
                </div>
                <div className="flex-1 p-6 flex flex-col items-center justify-center text-dark-500">
                    <p>Select a conversation to start messaging</p>
                    <span className="text-xs text-dark-600 mt-2">(This is a UI demo)</span>
                </div>
                <div className="p-4 border-t border-dark-600">
                    <input
                        className="w-full bg-dark-800 border-none rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-primary focus:outline-none placeholder-dark-500"
                        placeholder="Type a message..."
                    />
                </div>
            </div>
        </div>
    );
};

export default Messages;
