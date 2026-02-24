package main

import (
    "encoding/json"
    "log"
    "net/http"
)

// Order représente une commande avec ses champs JSON tagués correctement.
type Order struct {
    ID      string  `json:"id"`      // Identifiant unique de la commande
    Product string  `json:"product"` // Nom du produit
    Quantity int    `json:"quantity"` // Quantité commandée
    Price   float64 `json:"price"`   // Prix unitaire
}

// orders est une base de données en mémoire pour les exemples.
var orders = []Order{
    {ID: "1", Product: "Widget A", Quantity: 2, Price: 9.99},
    {ID: "2", Product: "Widget B", Quantity: 1, Price: 24.99},
}

// healthHandler répond avec un statut de santé OK.
func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// ordersHandler retourne la liste des commandes en JSON.
func ordersHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(orders); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func main() {
    // Enregistre les routes HTTP.
    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/orders", ordersHandler)

    port := ":8083"
    log.Printf("orders-api démarré sur %s", port)
    if err := http.ListenAndServe(port, nil); err != nil {
        log.Fatalf("Échec du serveur: %v", err)
    }
}
