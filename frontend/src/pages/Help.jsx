import { HelpCircle } from 'lucide-react';

const Help = () => {
    return (
        <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                <HelpCircle size={40} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">How can we help you?</h1>
            <p className="text-dark-500 mb-8">Search our knowledge base or contact support.</p>

            <div className="relative max-w-lg mx-auto mb-12">
                <input
                    type="text"
                    placeholder="Search help articles..."
                    className="w-full bg-dark-700 border border-dark-600 rounded-full py-4 pl-6 pr-4 text-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
                {['Getting Started', 'Account Management', 'Billing', 'API Documentation'].map((item) => (
                    <div key={item} className="p-4 bg-dark-700 border border-dark-600 rounded-xl hover:border-primary transition cursor-pointer">
                        <h3 className="text-white font-bold">{item}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Help;
