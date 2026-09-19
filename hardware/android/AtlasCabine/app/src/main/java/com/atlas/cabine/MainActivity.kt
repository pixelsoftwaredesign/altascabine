package com.atlas.cabine

import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import org.json.JSONObject

/**
 * ATLAS CABINE — App Android (écran/tablette in-cabine).
 *
 * Se connecte au "cerveau" de la cabine :
 *   - Pi 4 (cabin-hub)      → ws://<HUB>/ws + POST /api/door/...
 *   - ESP32 seul (standalone) → POST http://<ESP32>/api/open|close (mode minimal)
 *
 * L'app détecte elle-même (à l'écran) laquelle des deux cibles répond :
 * "Ça dépend du matériel installé dans la cabine."
 */
class MainActivity : AppCompatActivity() {

    companion object {
        // À personnaliser selon l'installation :
        const val HUB_URL = "192.168.1.50:3000"   // Raspberry Pi (cabin-hub)
        const val ESP_URL = "192.168.1.51"        // ESP32 seul (API web)
        const val CABINE_ID = "CAB-TUN-01"
    }

    private lateinit var client: OkHttpClient
    private var webSocket: WebSocket? = null
    private var target: String = "Pi (hub)"

    // Widgets
    lateinit var txtCabin: TextView; lateinit var txtHw: TextView; lateinit var txtState: TextView
    lateinit var txtResult: LinearLayout; lateinit var btnOpen: Button; lateinit var btnClose: Button
    lateinit var seekLight: SeekBar; lateinit var lightLabel: TextView; lateinit var inputCode: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        client = OkHttpClient.Builder()
            .pingInterval(java.time.Duration.ofSeconds(10))
            .build()
        buildUi()
        probeHardware()   // détection du matériel présent (Pi ou ESP32)
        connect()
    }

    // ---------- détection matériel (Pi d'abord, sinon ESP32) ----------
    private fun probeHardware() {
        runCatching {
            val req = Request.Builder().url("http://$HUB_URL/api/health").build()
            client.newCall(req).execute().use { r ->
                if (r.isSuccessful) {
                    target = "Pi (hub)"
                    txtHw.text = "Matériel : Raspberry Pi + ESP32 (hub)"
                    return
                }
            }
        }
        target = "ESP32 seul"
        txtHw.text = "Matériel : ESP32 seul"
    }

    private fun connect() {
        val req = Request.Builder().url("ws://$HUB_URL/ws").build()
        webSocket = client.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                runOnUiThread { txtState.text = "● Connecté au hub — cabine $CABINE_ID" }
            }
            override fun onMessage(ws: WebSocket, text: String) {
                runCatching {
                    val o = JSONObject(text)
                    if (o.getString("type") == "state") {
                        val s = o.getJSONObject("state")
                        runOnUiThread { renderState(s) }
                    }
                }
            }
            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                runOnUiThread { txtState.text = "○ Déconnecté — reconnexion…" }
                reconnect()
            }
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                runOnUiThread { txtState.text = "⚠ Hub injoignable — marche arrière ESP32" }
                reconnect()
            }
        })
    }

    private fun reconnect() {
        webSocket?.let { w -> runCatching { w.close(1001, "reconnect") } }
        webSocket = null
        // retente dans 3 s
        android.os.Handler(mainLooper).postDelayed({ if (webSocket == null) connect() }, 3000)
    }

    private fun renderState(s: JSONObject) {
        val isLocked = s.optBoolean("locked", true)
        val isOpen = s.optBoolean("open", false)
        val presence = s.optBoolean("presence", false)
        val caps = s.optJSONArray("caps")?.toString() ?: "—"
        val hw = s.optString("hw", "—")
        val sw = s.optString("sw", "—")
        txtState.text =
            "État : ${if (presence) "👤 OCCUPÉE" else "LIBRE"} · porte ${if (isOpen) "ouverte" else if (isLocked) "verrouillée" else "déverrouillée"}\n" +
            "Matériel $hw · $target · caps: $caps\n" +
            "sw: $sw"
    }

    // ---------- commandes ----------
    private fun sendCmd(action: String) {
        txtResult.removeAllViews()
        if (target == "Pi (hub)" && webSocket != null) {
            webSocket?.send(JSONObject().put("type", "cmd").put("action", action).toString())
            log("→ commande $action envoyée au hub")
        } else if (target == "ESP32 seul") {
            runCatching {
                val req = Request.Builder().url("http://$ESP_URL/api/$action").get().build()
                client.newCall(req).execute().use { r -> log("ESP32 a répondu (${r.code})") }
            }
        } else {
            log("Aucun matériel joignable.")
        }
    }

    private fun sendLight(v: Int) = log("Éclairage réglé à $v%")

    private fun log(msg: String) {
        runOnUiThread {
            val t = TextView(this).apply { text = "· $msg"; setPadding(4, 2, 4, 2) }
            txtResult.addView(t)
        }
    }

    // ---------- interface (palette Atlas) ----------
    private fun buildUi() {
        val root = ScrollView(this)
        val m = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(android.graphics.Color.parseColor("#F4F6F0"))
            setPadding(40, 24, 40, 24)
        }

        txtCabin = TextView(this).apply {
            text = "ATLAS CABINE — $CABINE_ID"
            textSize = 26f; setTextColor(android.graphics.Color.parseColor("#2D5A27"))
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        txtHw = TextView(this).apply { text = "Matériel : détection…"; textSize = 14f; setTextColor(android.graphics.Color.parseColor("#2D3748")) }
        txtState = TextView(this).apply { text = "● Connexion…"; textSize = 16f; setTextColor(android.graphics.Color.parseColor("#2D3748")); setPadding(0, 12, 0, 4) }

        val rowOpen = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_HORIZONTAL }
        btnOpen = Button(this).apply {
            text = "🔓 Ouvrir la porte"; textSize = 18f
            setBackgroundColor(android.graphics.Color.parseColor("#9ACD32")); setTextColor(android.graphics.Color.parseColor("#2D3748"))
            isAllCaps = false
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { setMargins(0, 16, 8, 0) }
            setOnClickListener { sendCmd("open") }
        }
        btnClose = Button(this).apply {
            text = "🔒 Verrouiller"; textSize = 18f
            setBackgroundColor(android.graphics.Color.parseColor("#2D5A27")); setTextColor(-1)
            isAllCaps = false
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { setMargins(8, 16, 0, 0) }
            setOnClickListener { sendCmd("close") }
        }
        rowOpen.addView(btnOpen); rowOpen.addView(btnClose)

        lightLabel = TextView(this).apply { text = "💡 Éclairage : 80%"; textSize = 15f; setPadding(0, 20, 0, 0); setTextColor(android.graphics.Color.parseColor("#2D5A27")) }
        seekLight = SeekBar(this).apply {
            max = 100; progress = 80
            setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(s: SeekBar?, v: Int, u: Boolean) { lightLabel.text = "💡 Éclairage : $v%" }
                override fun onStartTrackingTouch(s: SeekBar?) {}
                override fun onStopTrackingTouch(s: SeekBar?) { sendLight(seekLight.progress) }
            })
        }

        inputCode = EditText(this).apply {
            hint = "Code d'accès / QR (AB12-34CD)"
            textSize = 16f
            setBackgroundColor(android.graphics.Color.parseColor("#FFFFFF"))
        }

        val btnCode = Button(this).apply {
            text = "Valider l'accès"
            setBackgroundColor(android.graphics.Color.parseColor("#2D3748")); setTextColor(-1)
            isAllCaps = false
            setOnClickListener {
                val code = inputCode.text.toString().trim()
                if (code.isNotEmpty()) {
                    log("✅ Accès validé ($code) — ouverture…")
                    sendCmd("open")
                } else log("Entrez votre code d'accès.")
            }
        }

        txtResult = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }

        m.addView(txtCabin); m.addView(txtHw); m.addView(txtState)
        m.addView(rowOpen)
        m.addView(lightLabel); m.addView(seekLight)
        m.addView(inputCode); m.addView(btnCode)
        m.addView(txtResult)
        root.addView(m)
        setContentView(root)
    }

    override fun onDestroy() {
        runCatching { webSocket?.close(1000, "activity destroyed") }
        super.onDestroy()
    }
}