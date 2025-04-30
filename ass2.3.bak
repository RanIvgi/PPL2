#lang racket/base
;; Create a dictionary (just returns the list)
(define dict
    (lambda (pairs)
        pairs))

;; Get the value associated with a key
(define get
  (lambda (dict key)
    (if (eq? dict '())
        (make-error)
        (if (and (pair? (car dict)) (equal? key (car (car dict))))
            (cdr (car dict))
            (get (cdr dict) key)))))

(define forall
  (lambda (pred lst)
    (if (eq? lst '())
        #t
        (and (pred (car lst))
             (forall pred (cdr lst))))))

;; Check if something is a dictionary
(define dict?
  (lambda (x)
    (if (and (pair? x)
             (forall (lambda (p)
                       (pair? p))
                     x))
        #t
        #f)))

;; Error constructor
(define make-error
  (lambda ()
    'error))

;; Check if value is an error
(define is-error?
  (lambda (v)
    (eq? v 'error)))

;; Bind function: apply f to v if v is not an error
(define bind
  (lambda (v f)
    (if (is-error? v)
        v
        (f v))))