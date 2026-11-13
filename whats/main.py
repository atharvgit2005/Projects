import pywhatkit 

no = ["+918168156059", "+918368451967"]
for i in range(len(no)):
    pywhatkit.sendwhatmsg(no[i], "Hi this is a python generated message sent by Atharv",20, 46+i)
    print("Message sent to", i)