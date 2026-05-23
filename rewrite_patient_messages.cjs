const fs = require('fs');

const filePath = 'c:/Users/AL NABAA/Desktop/smart-dental-platform/src/pages/patient/PatientMessagesPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove mobileTab state
content = content.replace(/const \[mobileTab, setMobileTab\] = useState<'chat' \| 'services'>\('chat'\);\n/g, '');

const view2Start = content.indexOf('/* View 2: Overhauled Bento Grid & Chat Workspace */');
if (view2Start === -1) {
  console.error("Could not find View 2 start");
  process.exit(1);
}

// Extraction regexes
const extract = (regex) => {
  const match = content.match(regex);
  return match ? match[1] : '';
};

const bookingWidget = extract(/(\{?\/\* WIDGET 1: Booking Flow \*\/\}?[\s\S]*?)(?=\{?\/\* WIDGET 2: Appointments list \*\/\}?)/);
const appointmentsWidget = extract(/(\{?\/\* WIDGET 2: Appointments list \*\/\}?[\s\S]*?)(?=\{?\/\* WIDGET 3: Treatment Plans & Teeth Chart \*\/\}?)/);
const treatmentsWidget = extract(/(\{?\/\* WIDGET 3: Treatment Plans & Teeth Chart \*\/\}?[\s\S]*?)(?=\{?\/\* WIDGET 4: Clinic Info \*\/\}?)/);
const infoWidget = extract(/(\{?\/\* WIDGET 4: Clinic Info \*\/\}?[\s\S]*?)(?=<\/div>\s*<\/Card>)/);

const chatHeader = extract(/(\{?\/\* Chat header \*\/\}?[\s\S]*?)(?=\{?\/\* Mini Bento Grid Actions Row \*\/\}?)/);
const miniBento = extract(/(\{?\/\* Mini Bento Grid Actions Row \*\/\}?[\s\S]*?)(?=\{?\/\* Voice Session Pulsing banner when connecting or talking \*\/\}?)/);
const voiceBanner = extract(/(\{?\/\* Voice Session Pulsing banner when connecting or talking \*\/\}?[\s\S]*?)(?=\{?\/\* Messages logs threads \*\/\}?)/);
const messagesLogs = extract(/(\{?\/\* Messages logs threads \*\/\}?[\s\S]*?)(?=\{?\/\* Input Area \*\/\}?)/);
const inputArea = extract(/(\{?\/\* Input Area \*\/\}?[\s\S]*?)(?=<\/Card>\s*<\/div>\s*<\/div>\s*<\/main>)/);

const newView2 = `/* View 2: Unified AI Chat & Medical Services Workspace */
          <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden bg-white border-gray-100 shadow-2xl relative rounded-[2.5rem]">
              
${chatHeader}
${miniBento}
${voiceBanner}

              {activeBentoWidget !== 'none' ? (
                <div className="flex-1 overflow-y-auto bg-gray-50/50 custom-scrollbar flex flex-col">
                  {/* Expanded Header inside Chat */}
                  <div className="p-4 sm:p-5 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <span className="text-sm font-black text-teal-600 flex items-center gap-2">
                      {activeBentoWidget === 'booking' && 'طلب حجز موعد'}
                      {activeBentoWidget === 'appointments' && 'مواعيدي وجدول الزيارات'}
                      {activeBentoWidget === 'treatments' && 'الخطط العلاجية وحالة الأسنان'}
                      {activeBentoWidget === 'info' && 'معلومات وتفاصيل العيادة'}
                    </span>
                    <button
                      onClick={() => setActiveBentoWidget('none')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl transition-all text-xs font-black"
                    >
                      <ArrowRight className="w-4 h-4" /> العودة للمحادثة
                    </button>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
${bookingWidget}
${appointmentsWidget}
${treatmentsWidget}
${infoWidget}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
${messagesLogs}
${inputArea}
                </div>
              )}
            </Card>
          </div>
`;

const beforeView2 = content.substring(0, view2Start);
const afterView2 = content.substring(content.indexOf('</main>'));

fs.writeFileSync(filePath, beforeView2 + newView2 + afterView2, 'utf8');
console.log("Done rewriting PatientMessagesPage.tsx");
