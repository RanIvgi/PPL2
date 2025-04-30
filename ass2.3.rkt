#lang racket/base

;; Error constructor
(define make-error
  (lambda (msg)
    (list 'error msg)))

;; Check if value is an error
(define is-error?
  (lambda (v)
    (if (pair? v)
        (if (eq? (car v) 'error) #t #f)
        #f)))

;; Helper to get first key
(define first-key
  (lambda (pairs)
    (car (car pairs))))

;; Helper to get first value
(define first-value
  (lambda (pairs)
    (cdr (car pairs))))

;; Check if valid key (must be symbol)
(define valid-key?
  (lambda (k)
    (symbol? k)))

;; Helper to check if key exists
(define key-exists?
  (lambda (key pairs)
    (if (eq? pairs '())
        #f
        (if (eq? key (first-key pairs))
            #t
            (key-exists? key (cdr pairs))))))

;; Check for duplicate keys
(define has-duplicate-keys?
  (lambda (pairs)
    (if (eq? pairs '())
        #f
        (if (key-exists? (first-key pairs) (cdr pairs))
            #t
            (has-duplicate-keys? (cdr pairs))))))

;; Create dictionary with validation
(define dict
  (lambda (pairs)
    (if (not (forall (lambda (p) (valid-key? (car p))) pairs))
        (make-error "All keys must be symbols")
        (if (has-duplicate-keys? pairs)
            (make-error "Dictionary contains duplicate keys")
            pairs))))

;; Get value by key
(define get
  (lambda (dict key)
    (if (is-error? dict)
        dict
        (if (eq? dict '())
            (make-error "Key not found")
            (if (and (pair? (car dict)) (eq? key (first-key dict)))
                (first-value dict)
                (get (cdr dict) key))))))

;; Forall helper
(define forall
  (lambda (pred lst)
    (if (eq? lst '())
        #t
        (if (pred (car lst))
            (forall pred (cdr lst))
            #f))))

;; Dictionary validation
(define dict?
  (lambda (x)
    (if (is-error? x)
        #f
        (if (pair? x)
            (if (forall (lambda (p)
                          (if (pair? p)
                              (if (valid-key? (car p)) #t #f)
                              #f))
                        x)
                #t
                #f)
            #f))))

;; Bind function
(define bind
  (lambda (v f)
    (if (is-error? v)
        v
        (f v))))

;; Test cases
(define good-dict (dict '((a . 1) (b . 2) (c . 3))))
(define bad-dict (dict '((a . 1) (a . 2) (b . 3))))
(define number-keys (dict '((1 . a) (2 . b))))

(displayln good-dict)     ; '((a . 1) (b . 2) (c . 3))
(displayln bad-dict)      ; (error "Dictionary contains duplicate keys")
(displayln number-keys)   ; (error "All keys must be symbols")
(displayln (dict? '((1 . a) (2 . b)))) ; #f