import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const quotes = [
  { eng: "The secret of getting ahead is getting started.", hin: "आगे बढ़ने का रहस्य शुरुआत करना है।" },
  { eng: "It always seems impossible until it's done.", hin: "जब तक काम पूरा न हो जाए, तब तक वह असंभव ही लगता है।" },
  { eng: "Don't watch the clock; do what it does. Keep going.", hin: "घड़ी को मत देखो; वो करो जो घड़ी करती है, बस चलते रहो।" },
  { eng: "Success is the sum of small efforts, repeated day in and day out.", hin: "सफलता छोटे-छोटे प्रयासों का योग है, जो दिन-रात दोहराए जाते हैं।" },
  { eng: "Believe you can and you're halfway there.", hin: "विश्वास करें कि आप कर सकते हैं और आपने आधी मंजिल तय कर ली है।" }
];

export default function Quotes() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % quotes.length);
    }, 15000); // Change quote every 15 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#FFF7ED] border border-[#FED7AA] p-6 rounded-2xl shadow-sm text-center relative overflow-hidden my-6 transition-all duration-500">
      <Quote className="absolute top-2 left-2 text-[#FED7AA] opacity-40" size={48} />
      <div className="relative z-10 transition-opacity duration-1000">
        <p className="text-xl font-medium text-[#431407] mb-2 font-serif">
          "{quotes[index].eng}"
        </p>
        <p className="text-lg text-[#EA580C] font-semibold opacity-90">
          "{quotes[index].hin}"
        </p>
      </div>
      <Quote className="absolute bottom-2 right-2 text-[#FED7AA] opacity-40 rotate-180" size={48} />
    </div>
  );
}
