const fs = require('fs');
const file = 'src/pages/patient/PatientMessagesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const triggerWidgetMessageStr = `
  const triggerWidgetMessage = (widgetType: string) => {
    setActiveBentoWidget('none');
    
    const userText = widgetType === 'booking' ? 'أريد حجز موعد جديد' :
                     widgetType === 'appointments' ? 'أريد معرفة مواعيدي السابقة والقادمة' :
                     widgetType === 'treatments' ? 'أريد الإطلاع على خطتي العلاجية وحالة أسناني' : 'أريد معلومات عن العيادة وطرق التواصل';
                     
    setAiMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: userText, timestamp: new Date().toISOString(), type: 'text' },
      { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: new Date().toISOString(), type: 'widget', metadata: { widgetType, is_ai: true } }
    ]);
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };
`;

content = content.replace('  return (', triggerWidgetMessageStr + '\n  return (');

content = content.replace(/onClick=\{.*setActiveBentoWidget\('booking'\).*?\}/, `onClick={() => { triggerWidgetMessage('booking'); setBookingType('none'); setBookingSuccess(false); }}`);
content = content.replace(/onClick=\{\(\) => setActiveBentoWidget\('appointments'\)\}/, `onClick={() => triggerWidgetMessage('appointments')}`);
content = content.replace(/onClick=\{\(\) => setActiveBentoWidget\('treatments'\)\}/, `onClick={() => triggerWidgetMessage('treatments')}`);
content = content.replace(/onClick=\{\(\) => setActiveBentoWidget\('info'\)\}/, `onClick={() => triggerWidgetMessage('info')}`);

const startIndex = content.indexOf('{/* ACTIVE WIDGET INLINE */}');
if (startIndex !== -1) {
  const endMarker = '                    )}';
  let matchCount = 0;
  let endIndex = startIndex;
  
  while (matchCount < 5 && endIndex !== -1) {
    endIndex = content.indexOf(endMarker, endIndex + 1);
    matchCount++;
  }
  
  if (endIndex !== -1) {
    endIndex += endMarker.length;
    
    let widgetBlock = content.substring(startIndex, endIndex);
    
    widgetBlock = widgetBlock.replace(/activeBentoWidget/g, 'widgetType');
    widgetBlock = widgetBlock.replace(/\{widgetType !== 'none' && \(/, '');
    widgetBlock = widgetBlock.slice(0, widgetBlock.lastIndexOf(')}')) + widgetBlock.slice(widgetBlock.lastIndexOf(')}') + 2);
    
    const renderWidgetStr = `
  const renderWidget = (widgetType: string) => {
    return (
` + widgetBlock + `
    );
  };
`;
    content = content.replace('  return (', renderWidgetStr + '\n  return (');
    content = content.substring(0, startIndex) + content.substring(endIndex);
  }
}

content = content.replace(/\{msg\.type === 'confirmation' \|\| msg\.content === 'لقد قمت بتأكيد حضوري للموعد المحدد عبر المنصة\. شكراً لكم\.' \? \(/g, 
`{msg.type === 'widget' ? (
  <div className="max-w-[100%] w-full animate-in fade-in slide-in-from-bottom-2">
    {renderWidget(msg.metadata?.widgetType)}
  </div>
) : msg.type === 'confirmation' || msg.content === 'لقد قمت بتأكيد حضوري للموعد المحدد عبر المنصة. شكراً لكم.' ? (`);

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
