import re

file_path = "c:/Users/AL NABAA/Desktop/smart-dental-platform/src/pages/patient/PatientMessagesPage.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove mobileTab state
content = re.sub(r"const \[mobileTab, setMobileTab\] = useState\w*'chat' \| 'services'\w*\('chat'\);\n", "", content)

# Find the start of View 2
view_2_start = content.find("/* View 2: Overhauled Bento Grid & Chat Workspace */")
if view_2_start == -1:
    print("Could not find View 2 start")
    exit(1)

# Let's extract the expanded widget sections.
# We'll use more robust regex
booking_widget_match = re.search(r"({/\* WIDGET 1: Booking Flow \*/}.*?)(?={/\* WIDGET 2: Appointments list \*/})", content, re.DOTALL)
booking_widget = booking_widget_match.group(1) if booking_widget_match else ""

appointments_widget_match = re.search(r"({/\* WIDGET 2: Appointments list \*/}.*?)(?={/\* WIDGET 3: Treatment Plans & Teeth Chart \*/})", content, re.DOTALL)
appointments_widget = appointments_widget_match.group(1) if appointments_widget_match else ""

treatments_widget_match = re.search(r"({/\* WIDGET 3: Treatment Plans & Teeth Chart \*/}.*?)(?={/\* WIDGET 4: Clinic Info \*/})", content, re.DOTALL)
treatments_widget = treatments_widget_match.group(1) if treatments_widget_match else ""

info_widget_match = re.search(r"({/\* WIDGET 4: Clinic Info \*/}.*?)(?=</div>\s*</Card>)", content, re.DOTALL)
info_widget = info_widget_match.group(1) if info_widget_match else ""

# Now extract the chat parts
chat_header_match = re.search(r"({/\* Chat header \*/}.*?)(?={/\* Mini Bento Grid Actions Row \*/})", content, re.DOTALL)
chat_header = chat_header_match.group(1) if chat_header_match else ""

mini_bento_match = re.search(r"({/\* Mini Bento Grid Actions Row \*/}.*?)(?={/\* Voice Session Pulsing banner when connecting or talking \*/})", content, re.DOTALL)
mini_bento = mini_bento_match.group(1) if mini_bento_match else ""

voice_banner_match = re.search(r"({/\* Voice Session Pulsing banner when connecting or talking \*/}.*?)(?={/\* Messages logs threads \*/})", content, re.DOTALL)
voice_banner = voice_banner_match.group(1) if voice_banner_match else ""

messages_logs_match = re.search(r"({/\* Messages logs threads \*/}.*?)(?={/\* Input Area \*/})", content, re.DOTALL)
messages_logs = messages_logs_match.group(1) if messages_logs_match else ""

input_area_match = re.search(r"({/\* Input Area \*/}.*?)(?=</Card>\s*</div>\s*</div>\s*</main>)", content, re.DOTALL)
input_area = input_area_match.group(1) if input_area_match else ""

# Construct the new view 2
new_view_2 = f"""/* View 2: Unified AI Chat & Medical Services Workspace */
          <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden bg-white border-gray-100 shadow-2xl relative rounded-[2.5rem]">
              
{chat_header}
{mini_bento}
{voice_banner}

              {{activeBentoWidget !== 'none' ? (
                <div className="flex-1 overflow-y-auto bg-gray-50/50 custom-scrollbar flex flex-col">
                  {/* Expanded Header inside Chat */}
                  <div className="p-4 sm:p-5 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <span className="text-sm font-black text-teal-600 flex items-center gap-2">
                      {{activeBentoWidget === 'booking' && 'طلب حجز موعد'}}
                      {{activeBentoWidget === 'appointments' && 'مواعيدي وجدول الزيارات'}}
                      {{activeBentoWidget === 'treatments' && 'الخطط العلاجية وحالة الأسنان'}}
                      {{activeBentoWidget === 'info' && 'معلومات وتفاصيل العيادة'}}
                    </span>
                    <button
                      onClick={{() => setActiveBentoWidget('none')}}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl transition-all text-xs font-black"
                    >
                      <ArrowRight className="w-4 h-4" /> العودة للمحادثة
                    </button>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
{booking_widget}
{appointments_widget}
{treatments_widget}
{info_widget}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
{messages_logs}
{input_area}
                </div>
              )}}
            </Card>
          </div>
"""

# Replace in content
before_view_2 = content[:view_2_start]
after_view_2 = content[content.find("</main>"):]

new_content = before_view_2 + new_view_2 + after_view_2

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done rewriting PatientMessagesPage.tsx")
