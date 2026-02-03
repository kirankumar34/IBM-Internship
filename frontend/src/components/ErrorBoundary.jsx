import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    handleRetry = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-dark-700 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                        <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Something went wrong</h2>
                        <p className="text-dark-400 text-sm mb-8">
                            We encountered an unexpected error while loading this page. This usually happens due to temporary connection issues.
                        </p>

                        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 mb-8 text-left overflow-auto max-h-32">
                            <code className="text-[10px] text-red-400 font-mono">
                                {this.state.error && this.state.error.toString()}
                            </code>
                        </div>

                        <button
                            onClick={this.handleRetry}
                            className="bg-primary hover:bg-primary-hover text-dark-900 px-8 py-3 rounded-xl font-bold flex items-center justify-center w-full transition"
                        >
                            <RefreshCw size={18} className="mr-2" /> Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
