
import React from 'react';

interface HeroProps {
  onAction: () => void;
  onCorporateAction: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onAction, onCorporateAction }) => {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-tertiary rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="inline-block px-4 py-1.5 mb-6 text-xs font-black uppercase tracking-[0.3em] bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">
          San Francisco • TU Studio
        </h2>
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="TU Studio" className="h-64 sm:h-80 object-contain" />
        </div>
        <h1 className="text-6xl sm:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
          The Union of <br />
          <span className="gradient-text">Reality & Art</span>
        </h1>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-full mb-8">
          <span className="material-symbols-outlined text-primary text-sm">verified</span>
          <span className="text-xs font-black uppercase tracking-widest text-primary">First & Only Multimedia & App Studio in the World</span>
        </div>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-12">
          Led by <span className="text-gray-900 dark:text-white font-bold">Eric A. Molina Denegri</span>, we produce bold content for YouTube, Odysee, and social platforms, seeking to understand the human connection.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onAction}
            className="w-full sm:w-auto px-10 py-5 bg-primary text-white font-black text-lg rounded-full shadow-2xl shadow-primary/40 hover:bg-red-600 transition-all active:scale-95"
          >
            Explore Programs
          </button>
          <button 
            onClick={onCorporateAction}
            className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-bold text-lg rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Corporate Services
          </button>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Subscribers', val: '2.4M+' },
            { label: 'Hours Produced', val: '12K+' },
            { label: 'Countries', val: '45+' },
            { label: 'Projects', val: '300+' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black text-primary mb-1">{stat.val}</div>
              <div className="text-xs uppercase tracking-widest text-gray-500 font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
