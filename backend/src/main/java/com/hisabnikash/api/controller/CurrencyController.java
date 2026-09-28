package com.hisabnikash.api.controller;

import com.hisabnikash.api.entity.Currency;
import com.hisabnikash.api.repository.CurrencyRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/currencies")
public class CurrencyController {

    private final CurrencyRepository currencyRepository;

    public CurrencyController(CurrencyRepository currencyRepository) {
        this.currencyRepository = currencyRepository;
    }

    @GetMapping
    public ResponseEntity<List<Currency>> getAllCurrencies() {
        List<Currency> list = currencyRepository.findAll();
        list.sort(Comparator.comparing(Currency::getCurrencyCode));
        return ResponseEntity.ok(list);
    }
}
