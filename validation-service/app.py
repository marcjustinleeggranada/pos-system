import logging

from flask import Flask, jsonify, request

from validator import validate_recommendations

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "pos-validation"})


@app.route("/validate", methods=["POST"])
def validate():
    payload = request.get_json(silent=True) or {}
    recommendations = payload.get("recommendations", [])

    if not isinstance(recommendations, list) or len(recommendations) == 0:
        return jsonify({"error": "recommendations must be a non-empty array"}), 400

    logger.info(
        "Validating %d recommendation(s) for store_id=%s",
        len(recommendations),
        payload.get("storeId"),
    )

    result = validate_recommendations(payload)
    return jsonify(result)


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
